import { eq, and, inArray, sql } from "drizzle-orm";
import { forumComments, forumLikes, forumMedias, forumReplies, forums, users } from "../../../db/schema";
import { db } from "../../../db/index";
import { Request, Response } from "express";
import { forumCommentLikes } from "../../../db/models/forum_comment_like";
import { forumCommentMedias } from "../../../db/models/forum_comment_media";
import { forumReplyMedias } from "../../../db/models/forum_reply_media";
import { deleteReply } from "./forum_replies.controller";
import { deleteFromCloudflare, uploadImageToCloudflare } from "../../../db/cloudflare/cloudflareFunction";

interface AuthenticatedRequest extends Request {
	user?: {
		userId: string;
		// add other user properties if needed
	};
}

export const getAllCommentsForAForum = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: 1 };

		const comments = await db
			.select({
				id: forumComments.id,
				userId: forumComments.userId,
				forumId: forumComments.forumId,
				description: forumComments.description,
				createdAt: forumComments.createdAt,
				updatedAt: forumComments.updatedAt,
				mediaUrl: forumCommentMedias.url,
				mediaType: forumCommentMedias.mediaType,
				username: sql`${users.firstName} || ' ' || ${users.lastName}`,
				isLike: sql`CASE WHEN ${forumCommentLikes.forumCommentId} IS NOT NULL THEN true ELSE false END`,
			})
			.from(forumComments)
			.leftJoin(forumCommentMedias, eq(forumComments.id, forumCommentMedias.forumCommentId))
			.leftJoin(
				forumCommentLikes,
				and(
					eq(forumCommentLikes.forumCommentId, forumComments.id),
					eq(forumCommentLikes.userId, Number(userId))
				)
			)
			.leftJoin(users, eq(users.id, forumComments.userId))
			.where(eq(forumComments.forumId, Number(id)));

		if (!comments || comments.length === 0) {
			return res.status(200).json([]);
		}

		const commentsWithMedia = Object.values(
			comments.reduce((acc, comment) => {
				if (!acc[comment.id]) {
					acc[comment.id] = {
						id: comment.id,
						userId: comment.userId,
						forumId: comment.forumId,
						description: comment.description,
						createdAt: comment.createdAt,
						updatedAt: comment.updatedAt,
						media: [] as { url: string; type: string }[],
						username: comment.username,
						isLike: !!comment.isLike,
					};
				}
				if (comment.mediaUrl) {
					acc[comment.id].media.push({
						url: comment.mediaUrl,
						type: comment.mediaType,
					});
				}
				return acc;
			}, {} as { [key: number]: any })
		) as Record<number, any>[];

		return res.status(200).json(commentsWithMedia);
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const postForumComment = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: 1 };
		const { description } = req.body;
		const { id } = req.params;

		if (!userId || !id || !description) {
			return res.status(400).json({ success: false, message: "Missing required fields" });
		}

		const [insertedForumComment] = await db
			.insert(forumComments)
			.values({
				userId: Number(userId),
				forumId: Number(id),
				description,
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();

		let newCommentMedia: any[] = [];
		if (req.files) {
			for (const file of req.files as Express.Multer.File[]) {
				try {
					const uniqueKey = `${insertedForumComment.id}-${crypto.randomUUID()}-${file.originalname}`;
					const url = await uploadImageToCloudflare(uniqueKey, file.buffer, file.mimetype);
					const [media] = await db
						.insert(forumCommentMedias)
						.values({
							forumCommentId: insertedForumComment.id,
							url: url,
							urlForDeletion: uniqueKey,
							mediaType: file.mimetype.startsWith("video") ? "video" : "image",
							createdAt: new Date(),
							updatedAt: new Date(),
						})
						.returning();
					newCommentMedia.push(media);
				} catch (error) {
					console.error("Error uploading file or saving media:", error);
				}
			}
		}

		return res.status(201).json({
			success: true,
			comment: insertedForumComment,
			newCommentMedia,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const likeForumComment = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: 1 };

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		const like = await db
			.insert(forumCommentLikes)
			.values({
				userId: Number(userId),
				forumCommentId: Number(id),
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();

		return res.status(200).json({ like });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const unlikeForumComment = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: 1 };

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		const unlike = await db
			.delete(forumCommentLikes)
			.where(and(eq(forumCommentLikes.userId, Number(userId)), eq(forumCommentLikes.forumCommentId, Number(id))))
			.returning();

		return res.status(200).json({ unlike });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const updateForumComment = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params;
		const { description, photosToRemove } = req.body;

		const doesUserOwnThisComment = await db
			.select()
			.from(forumComments)
			.where(and(eq(forumComments.id, Number(id)), eq(forumComments.userId, Number(userId))))
			.limit(1);

		if (doesUserOwnThisComment.length === 0) {
			return res.status(404).json({ success: false, message: "Comment not found" });
		}

		let photosToRemoveParse: { url: string }[] = [];
		if (photosToRemove) {
			try {
				photosToRemoveParse = JSON.parse(photosToRemove);
			} catch (err) {
				return res.status(400).json({ success: false, message: "Invalid photosToRemove format" });
			}
		}

		let newCommentMedia: any[] = [];
		if (req.files) {
			for (const file of req.files as Express.Multer.File[]) {
				try {
					const uniqueKey = `${id}-${crypto.randomUUID()}-${file.originalname}`;
					const url = await uploadImageToCloudflare(uniqueKey, file.buffer, file.mimetype);
					const [media] = await db
						.insert(forumCommentMedias)
						.values({
							forumCommentId: Number(id),
							url: url,
							urlForDeletion: uniqueKey,
							mediaType: file.mimetype.startsWith("video") ? "video" : "image",
							createdAt: new Date(),
							updatedAt: new Date(),
						})
						.returning();
					newCommentMedia.push(media);
				} catch (error) {
					console.error("Error uploading file or saving media:", error);
				}
			}
		}

		let deleteMedia = null;
		if (photosToRemoveParse && photosToRemoveParse.length > 0) {
			const deleteResults = await Promise.all(
				photosToRemoveParse.map(async (photoToRemove: any) => {
					const urlForDeletion = await db
						.select({
							urlForDeletion: forumCommentMedias.urlForDeletion,
						})
						.from(forumCommentMedias)
						.where(eq(forumCommentMedias.url, photoToRemove.url));
					let deleted = null;
					if (urlForDeletion[0]?.urlForDeletion) {
						await deleteFromCloudflare("komplex-image", urlForDeletion[0].urlForDeletion);
						deleted = await db
							.delete(forumCommentMedias)
							.where(
								and(
									eq(forumCommentMedias.forumCommentId, Number(id)),
									eq(forumCommentMedias.urlForDeletion, urlForDeletion[0].urlForDeletion)
								)
							)
							.returning();
					}
					return deleted;
				})
			);

			deleteMedia = deleteResults.flat();
		}

		const [updateComment] = await db
			.update(forumComments)
			.set({
				description,
				updatedAt: new Date(),
			})
			.where(eq(forumComments.id, Number(id)))
			.returning();

		return res.status(200).json({ updateComment, newCommentMedia, deleteMedia });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const deleteForumComment = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params; // id = commentId

		const doesUserOwnThisComment = await db
			.select()
			.from(forumComments)
			.where(and(eq(forumComments.id, Number(id)), eq(forumComments.userId, Number(userId))))
			.limit(1);

		if (doesUserOwnThisComment.length === 0) {
			return res.status(404).json({ success: false, message: "Comment not found" });
		}

		const doesThisCommentHasReply = await db
			.select()
			.from(forumReplies)
			.where(eq(forumReplies.forumCommentId, Number(id)));
		let replyResults = null;
		if (doesThisCommentHasReply.length > 0) {
			replyResults = await deleteReply(Number(userId), null, Number(id));
		}
		const commentResults = await deleteComment(Number(userId), Number(id), null);

		return res.status(200).json({
			success: true,
			message: "Comment deleted successfully",
			replyResults,
			commentResults,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const deleteComment = async (userId: number, commentId: number | null, forumId: number | null) => {
	if (commentId === null && forumId === null) {
		throw new Error("Either commentId or forumId must be provided");
	}

	// Delete by commentId
	if (commentId && forumId === null) {
		const mediasToDelete = await db
			.select({ urlForDeletion: forumCommentMedias.urlForDeletion })
			.from(forumCommentMedias)
			.where(eq(forumCommentMedias.forumCommentId, commentId));

		for (const media of mediasToDelete) {
			if (media.urlForDeletion) {
				await deleteFromCloudflare("komplex-image", media.urlForDeletion);
			}
		}

		const deletedMedia = await db
			.delete(forumCommentMedias)
			.where(eq(forumCommentMedias.forumCommentId, commentId))
			.returning({ url: forumCommentMedias.url, mediaType: forumCommentMedias.mediaType });

		const deletedLikes = await db
			.delete(forumCommentLikes)
			.where(eq(forumCommentLikes.forumCommentId, commentId))
			.returning();

		const deletedComment = await db
			.delete(forumComments)
			.where(and(eq(forumComments.id, commentId), eq(forumComments.userId, userId)))
			.returning();

		return { deletedComment, deletedMedia, deletedLikes };
	}

	// Delete all comments for a forumId
	if (forumId && commentId === null) {
		const getCommentIdsByForumId = await db
			.select({ id: forumComments.id })
			.from(forumComments)
			.where(eq(forumComments.forumId, forumId));
		const commentIds = getCommentIdsByForumId.map((c) => c.id);

		// First, select all medias to delete from the cloud
		const mediasToDelete = await db
			.select({ urlForDeletion: forumCommentMedias.urlForDeletion })
			.from(forumCommentMedias)
			.where(
				commentIds.length > 0
					? inArray(forumCommentMedias.forumCommentId, commentIds)
					: eq(forumCommentMedias.forumCommentId, -1)
			);

		for (const media of mediasToDelete) {
			if (media.urlForDeletion) {
				await deleteFromCloudflare("komplex-image", media.urlForDeletion);
			}
		}

		// Then, delete from the database
		const deletedMedia = await db
			.delete(forumCommentMedias)
			.where(
				commentIds.length > 0
					? inArray(forumCommentMedias.forumCommentId, commentIds)
					: eq(forumCommentMedias.forumCommentId, -1)
			)
			.returning();

		const deletedLikes = await db
			.delete(forumCommentLikes)
			.where(
				commentIds.length > 0
					? inArray(forumCommentLikes.forumCommentId, commentIds)
					: eq(forumCommentLikes.forumCommentId, -1)
			)
			.returning();

		const deletedComment = await db
			.delete(forumComments)
			.where(commentIds.length > 0 ? inArray(forumComments.id, commentIds) : eq(forumComments.id, -1))
			.returning();

		return { deletedComment, deletedMedia, deletedLikes };
	}
};
