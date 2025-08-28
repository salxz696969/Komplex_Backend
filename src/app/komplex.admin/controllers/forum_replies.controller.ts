import { eq, and, inArray, sql } from "drizzle-orm";
import { forumComments, forumLikes, forumMedias, forumReplies, forums, users } from "../../../db/schema";
import { db } from "../../../db/index";
import { Request, Response } from "express";
import { forumReplyLikes } from "../../../db/models/forum_reply_like";
import { forumReplyMedias } from "../../../db/models/forum_reply_media";
import { deleteFromCloudflare, uploadImageToCloudflare } from "../../../db/cloudflare/cloudflareFunction";
import { AuthenticatedRequest } from "../../../types/request";

export const getAllRepliesForAComment = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: 1 };

		const replies = await db
			.select({
				id: forumReplies.id,
				userId: forumReplies.userId,
				forumCommentId: forumReplies.forumCommentId,
				description: forumReplies.description,
				createdAt: forumReplies.createdAt,
				updatedAt: forumReplies.updatedAt,
				mediaUrl: forumReplyMedias.url,
				mediaType: forumReplyMedias.mediaType,
				username: sql`${users.firstName} || ' ' || ${users.lastName}`,
				isLike: sql`CASE WHEN ${forumReplyLikes.forumReplyId} IS NOT NULL THEN true ELSE false END`,
			})
			.from(forumReplies)
			.leftJoin(forumReplyMedias, eq(forumReplies.id, forumReplyMedias.forumReplyId))
			.leftJoin(
				forumReplyLikes,
				and(eq(forumReplyLikes.forumReplyId, forumReplies.id), eq(forumReplyLikes.userId, Number(userId)))
			)
			.leftJoin(users, eq(forumReplies.userId, users.id))
			.where(eq(forumReplies.forumCommentId, Number(id)));

		if (!replies || replies.length === 0) {
			return res.status(200).json([]);
		}

		const repliesWithMedia = Object.values(
			replies.reduce((acc, reply) => {
				if (!acc[reply.id]) {
					acc[reply.id] = {
						id: reply.id,
						userId: reply.userId,
						forumCommentId: reply.forumCommentId,
						description: reply.description,
						createdAt: reply.createdAt,
						updatedAt: reply.updatedAt,
						media: [] as { url: string; type: string }[],
						username: reply.username,
						isLike: !!reply.isLike,
					};
				}
				if (reply.mediaUrl) {
					acc[reply.id].media.push({
						url: reply.mediaUrl,
						type: reply.mediaType,
					});
				}
				return acc;
			}, {} as { [key: number]: any })
		) as Record<number, any>[];

		return res.status(200).json(repliesWithMedia);
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const postForumReply = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: 1 };
		const { description } = req.body;
		const { id } = req.params;

		if (!userId || !id || !description) {
			return res.status(400).json({ success: false, message: "Missing required fields" });
		}

		const [insertedForumReply] = await db
			.insert(forumReplies)
			.values({
				userId: Number(userId),
				forumCommentId: Number(id),
				description,
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();

		let newReplyMedia: any[] = [];
		if (req.files) {
			for (const file of req.files as Express.Multer.File[]) {
				try {
					const uniqueKey = `${insertedForumReply.id}-${crypto.randomUUID()}-${file.originalname}`;
					const url = await uploadImageToCloudflare(uniqueKey, file.buffer, file.mimetype);
					const [media] = await db
						.insert(forumReplyMedias)
						.values({
							forumReplyId: insertedForumReply.id,
							url: url,
							urlForDeletion: uniqueKey,
							mediaType: file.mimetype.startsWith("video") ? "video" : "image",
							createdAt: new Date(),
							updatedAt: new Date(),
						})
						.returning();
					newReplyMedia.push(media);
				} catch (error) {
					console.error("Error uploading file or saving media:", error);
				}
			}
		}

		return res.status(201).json({
			success: true,
			reply: insertedForumReply,
			newReplyMedia,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const likeForumCommentReply = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: 1 };

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		const like = await db
			.insert(forumReplyLikes)
			.values({
				userId: Number(userId),
				forumReplyId: Number(id),
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

export const unlikeForumCommentReply = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: 1 };

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		const unlike = await db
			.delete(forumReplyLikes)
			.where(and(eq(forumReplyLikes.userId, Number(userId)), eq(forumReplyLikes.forumReplyId, Number(id))))
			.returning();

		return res.status(200).json({ unlike });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const updateForumReply = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params;
		const { description, photosToRemove } = req.body;

		const doesUserOwnThisReply = await db
			.select()
			.from(forumReplies)
			.where(and(eq(forumReplies.id, Number(id)), eq(forumReplies.userId, Number(userId))))
			.limit(1);

		if (doesUserOwnThisReply.length === 0) {
			return res.status(404).json({ success: false, message: "Reply not found" });
		}

		let photosToRemoveParse: { url: string }[] = [];
		if (photosToRemove) {
			try {
				photosToRemoveParse = JSON.parse(photosToRemove);
			} catch (err) {
				return res.status(400).json({ success: false, message: "Invalid photosToRemove format" });
			}
		}

		let newReplyMedia: any[] = [];
		if (req.files) {
			for (const file of req.files as Express.Multer.File[]) {
				try {
					const uniqueKey = `${id}-${crypto.randomUUID()}-${file.originalname}`;
					const url = await uploadImageToCloudflare(uniqueKey, file.buffer, file.mimetype);
					const [media] = await db
						.insert(forumReplyMedias)
						.values({
							forumReplyId: Number(id),
							url: url,
							urlForDeletion: uniqueKey,
							mediaType: file.mimetype.startsWith("video") ? "video" : "image",
							createdAt: new Date(),
							updatedAt: new Date(),
						})
						.returning();
					newReplyMedia.push(media);
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
							urlForDeletion: forumReplyMedias.urlForDeletion,
						})
						.from(forumReplyMedias)
						.where(eq(forumReplyMedias.url, photoToRemove.url));
					let deleted = null;
					if (urlForDeletion[0]?.urlForDeletion) {
						await deleteFromCloudflare("komplex-image", urlForDeletion[0].urlForDeletion);
						deleted = await db
							.delete(forumReplyMedias)
							.where(
								and(
									eq(forumReplyMedias.forumReplyId, Number(id)),
									eq(forumReplyMedias.urlForDeletion, urlForDeletion[0].urlForDeletion)
								)
							)
							.returning();
					}
					return deleted;
				})
			);

			deleteMedia = deleteResults.flat();
		}

		const [updateReply] = await db
			.update(forumReplies)
			.set({
				description,
				updatedAt: new Date(),
			})
			.where(eq(forumReplies.id, Number(id)))
			.returning();

		return res.status(200).json({ updateReply, newReplyMedia, deleteMedia });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const deleteForumReply = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params;

		const doesUserOwnThisReply = await db
			.select()
			.from(forumReplies)
			.where(and(eq(forumReplies.id, Number(id)), eq(forumReplies.userId, Number(userId))))
			.limit(1);

		if (doesUserOwnThisReply.length === 0) {
			return res.status(404).json({ success: false, message: "Reply not found" });
		}
		const result = await deleteReply(Number(userId), Number(id), null);

		return res.status(200).json({
			success: true,
			message: "Reply deleted successfully",
			...result,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const deleteReply = async (userId: number, replyId: number | null, commentId: number | null) => {
	if (replyId === null && commentId === null) {
		throw new Error("Either replyId or commentId must be provided");
	}

	// Delete by replyId
	if (replyId && commentId === null) {
		// Select all medias to delete from Cloudflare
		const mediasToDelete = await db
			.select({ urlForDeletion: forumReplyMedias.urlForDeletion })
			.from(forumReplyMedias)
			.where(eq(forumReplyMedias.forumReplyId, replyId));

		for (const media of mediasToDelete) {
			if (media.urlForDeletion) {
				await deleteFromCloudflare("komplex-image", media.urlForDeletion);
			}
		}

		// Delete from database
		const deletedMedia = await db
			.delete(forumReplyMedias)
			.where(eq(forumReplyMedias.forumReplyId, replyId))
			.returning({ url: forumReplyMedias.url, mediaType: forumReplyMedias.mediaType });

		const deletedReply = await db
			.delete(forumReplies)
			.where(and(eq(forumReplies.id, replyId), eq(forumReplies.userId, userId)))
			.returning();

		return { deletedReply, deletedMedia };
	}

	// Delete all replies for a commentId
	if (commentId && replyId === null) {
		const getReplyIdsByCommentId = await db
			.select({ id: forumReplies.id })
			.from(forumReplies)
			.where(eq(forumReplies.forumCommentId, commentId));
		const replyIds = getReplyIdsByCommentId.map((r) => r.id);

		// Select all medias to delete from Cloudflare
		const mediasToDelete = await db
			.select({ urlForDeletion: forumReplyMedias.urlForDeletion })
			.from(forumReplyMedias)
			.where(
				replyIds.length > 0
					? inArray(forumReplyMedias.forumReplyId, replyIds)
					: eq(forumReplyMedias.forumReplyId, -1)
			);

		for (const media of mediasToDelete) {
			if (media.urlForDeletion) {
				await deleteFromCloudflare("komplex-image", media.urlForDeletion);
			}
		}

		// Delete from database
		const deletedMedia = await db
			.delete(forumReplyMedias)
			.where(
				replyIds.length > 0
					? inArray(forumReplyMedias.forumReplyId, replyIds)
					: eq(forumReplyMedias.forumReplyId, -1)
			)
			.returning();

		const deletedReply = await db
			.delete(forumReplies)
			.where(replyIds.length > 0 ? inArray(forumReplies.id, replyIds) : eq(forumReplies.id, -1))
			.returning();

		return { deletedReply, deletedMedia };
	}
};
