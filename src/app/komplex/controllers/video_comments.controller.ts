import { eq, and, inArray, sql } from "drizzle-orm";
import { Request, Response } from "express";
import { db } from "../../../db";
import { users, videoReplies } from "../../../db/schema";
import { videoComments } from "../../../db/models/video_comments";
import { videoCommentMedias } from "../../../db/models/video_comment_medias";
import { videoCommentLike } from "../../../db/models/video_comment_like";
import { deleteFromCloudinary, uploadToCloudinary } from "../../../db/cloudinary/cloundinaryFunction";
import { deleteVideoReply } from "./video_replies.controller";

interface AuthenticatedRequest extends Request {
	user?: {
		userId: string;
	};
}

export const getAllVideoCommentsForAVideo = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: 1 };

		const comments = await db
			.select({
				id: videoComments.id,
				userId: videoComments.userId,
				videoId: videoComments.videoId,
				description: videoComments.description,
				createdAt: videoComments.createdAt,
				updatedAt: videoComments.updatedAt,
				mediaUrl: videoCommentMedias.url,
				mediaType: videoCommentMedias.mediaType,
				username: sql`${users.firstName} || ' ' || ${users.lastName}`,
				isLike: sql`CASE WHEN ${videoCommentLike.videoCommentId} IS NOT NULL THEN true ELSE false END`,
			})
			.from(videoComments)
			.leftJoin(videoCommentMedias, eq(videoComments.id, videoCommentMedias.videoCommentId))
			.leftJoin(
				videoCommentLike,
				and(eq(videoCommentLike.videoCommentId, videoComments.id), eq(videoCommentLike.userId, Number(userId)))
			)
			.leftJoin(users, eq(users.id, videoComments.userId))
			.where(eq(videoComments.videoId, Number(id)));

		if (!comments || comments.length === 0) {
			return res.status(200).json([]);
		}

		const commentsWithMedia = Object.values(
			comments.reduce((acc, comment) => {
				if (!acc[comment.id]) {
					acc[comment.id] = {
						id: comment.id,
						userId: comment.userId,
						videoId: comment.videoId,
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

export const postVideoComment = async (req: AuthenticatedRequest, res: Response) => {
	let public_id: string[] = [];
	let secure_url: string[] = [];
	let mediaType: ("image" | "video")[] = [];

	try {
		if (Array.isArray(req.files) && req.files.length > 0) {
			const files = req.files as Express.Multer.File[];
			const uploadResults = await Promise.all(
				files.map((file) => uploadToCloudinary(file.buffer, "my_app_uploads", "auto"))
			);
			uploadResults.forEach((result, index) => {
				secure_url.push((result as { secure_url: string }).secure_url);
				public_id.push((result as { public_id: string }).public_id);
				mediaType.push(files[index].mimetype.startsWith("video") ? "video" : "image");
			});
		}

		const { userId } = req.user ?? { userId: 1 };
		const { description } = req.body;
		const { id } = req.params;

		if (!userId || !id || !description) {
			return res.status(400).json({ success: false, message: "Missing required fields" });
		}

		const insertedVideoComment = await db
			.insert(videoComments)
			.values({
				userId: Number(userId),
				videoId: Number(id),
				description,
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();

		let newCommentMedia = null;
		if (public_id.length > 0 && mediaType.length > 0) {
			const values = [];
			for (let i = 0; i < public_id.length; i++) {
				values.push({
					userId: Number(userId),
					videoCommentId: insertedVideoComment[0].id,
					url: secure_url[i],
					urlForDeletion: public_id[i],
					mediaType: mediaType[i],
					createdAt: new Date(),
					updatedAt: new Date(),
				});
				console.log(values[i]);
			}
			newCommentMedia = await db.insert(videoCommentMedias).values(values).returning();
		}

		return res.status(201).json({
			success: true,
			comment: insertedVideoComment[0],
			newCommentMedia,
			mediaType,
		});
	} catch (error) {
		if (public_id.length > 0 && mediaType.length > 0) {
			try {
				await Promise.all(
					public_id.map((id, index) => deleteFromCloudinary(secure_url[index], mediaType[index]))
				);
			} catch (err) {
				console.error("Failed to delete uploaded media:", err);
			}
		}
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const likeVideoComment = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: 1 };

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		const like = await db
			.insert(videoCommentLike)
			.values({
				userId: Number(userId),
				videoCommentId: Number(id),
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

export const unlikeVideoComment = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: 1 };

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		const unlike = await db
			.delete(videoCommentLike)
			.where(and(eq(videoCommentLike.userId, Number(userId)), eq(videoCommentLike.videoCommentId, Number(id))))
			.returning();

		return res.status(200).json({ unlike });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const updateVideoComment = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params;
		const { description, photosToRemove, public_id, secure_url, mediaType } = req.body;

		let photosToRemoveParse: { url: string }[] = [];
		if (photosToRemove) {
			try {
				photosToRemoveParse = JSON.parse(photosToRemove);
			} catch (err) {
				return res.status(400).json({ success: false, message: "Invalid photosToRemove format" });
			}
		}

		const doesUserOwnThisComment = await db
			.select()
			.from(videoComments)
			.where(and(eq(videoComments.id, Number(id)), eq(videoComments.userId, Number(userId))))
			.limit(1);

		if (doesUserOwnThisComment.length === 0) {
			return res.status(404).json({ success: false, message: "Comment not found" });
		}

		let deleteMedia = null;
		if (photosToRemoveParse && photosToRemoveParse.length > 0) {
			const deleteResults = await Promise.all(
				photosToRemoveParse.map(async (mediaToRemove) => {
					await deleteFromCloudinary(mediaToRemove.url ?? "", undefined);
					const deleted = await db
						.delete(videoCommentMedias)
						.where(
							and(
								eq(videoCommentMedias.videoCommentId, Number(id)),
								eq(videoCommentMedias.urlForDeletion, mediaToRemove.url)
							)
						)
						.returning();
					return deleted;
				})
			);
			deleteMedia = deleteResults.flat();
		}

		let newCommentMedia = null;
		if (secure_url.length > 0) {
			const values = [];
			for (let i = 0; i < secure_url.length; i++) {
				values.push({
					videoCommentId: Number(id),
					url: secure_url[i],
					urlForDeletion: public_id[i],
					mediaType: mediaType[i],
					createdAt: new Date(),
					updatedAt: new Date(),
				});
			}
			newCommentMedia = await db.insert(videoCommentMedias).values(values).returning();
		}

		const updateComment = await db
			.update(videoComments)
			.set({
				description,
				updatedAt: new Date(),
			})
			.where(eq(videoComments.id, Number(id)))
			.returning();

		return res.status(200).json({ updateComment, newCommentMedia, deleteMedia });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const deleteVideoComment = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params; // id = commentId

		const commentRecord = await db
			.select()
			.from(videoComments)
			.where(and(eq(videoComments.id, Number(id)), eq(videoComments.userId, Number(userId))))
			.limit(1);

		

		if (commentRecord.length === 0) {
			return res.status(404).json({ success: false, message: "Comment not found" });
		}

		const commentResults = await deleteVideoCommentInternal(Number(userId), Number(id), null);

		return res.status(200).json({
			success: true,
			message: "Comment deleted successfully",
			commentResults,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const deleteVideoCommentInternal = async (userId: number, commentId: number | null, videoId: number | null) => {
	if (commentId === null && videoId === null) {
		throw new Error("Either commentId or videoId must be provided");
	}

	// Delete by commentId
	if (commentId && videoId === null) {
        const doesThisCommentHasReply = await db
			.select()
			.from(videoReplies)
			.where(eq(videoReplies.videoCommentId, Number(commentId)))
			.limit(1);

        let deleteReply = null;
		if (doesThisCommentHasReply.length > 0) {
			// If the comment has replies, we need to delete them as well
			deleteReply = await deleteVideoReply(Number(userId), null, Number(commentId));
		}
		const deletedMedia = await db
			.delete(videoCommentMedias)
			.where(eq(videoCommentMedias.videoCommentId, commentId))
			.returning({ url: videoCommentMedias.url, mediaType: videoCommentMedias.mediaType });

		for (const media of deletedMedia) {
			await deleteFromCloudinary(media.url ?? "", media.mediaType ?? undefined);
		}

		const deletedLikes = await db
			.delete(videoCommentLike)
			.where(eq(videoCommentLike.videoCommentId, commentId))
			.returning();

		const deletedComment = await db
			.delete(videoComments)
			.where(and(eq(videoComments.id, commentId), eq(videoComments.userId, userId)))
			.returning();

		return { deletedComment, deletedMedia, deletedLikes, deleteReply };
	}

	// Delete all comments for a videoId
	if (videoId && commentId === null) {
        const doesThisCommentHasReply = await db
			.select()
			.from(videoReplies)
			.where(eq(videoReplies.videoCommentId, Number(commentId)))
			.limit(1);

        let deleteReply = null;
		if (doesThisCommentHasReply.length > 0) {
			// If the comment has replies, we need to delete them as well
			deleteReply = await deleteVideoReply(Number(userId), null, Number(commentId));
		}
		const getCommentIdsByVideoId = await db
			.select({ id: videoComments.id })
			.from(videoComments)
			.where(eq(videoComments.videoId, videoId));
		const commentIds = getCommentIdsByVideoId.map((c) => c.id);

		const deletedMedia = await db
			.delete(videoCommentMedias)
			.where(
				commentIds.length > 0
					? inArray(videoCommentMedias.videoCommentId, commentIds)
					: eq(videoCommentMedias.videoCommentId, -1)
			)
			.returning({ url: videoCommentMedias.url, mediaType: videoCommentMedias.mediaType });

		for (const media of deletedMedia) {
			await deleteFromCloudinary(media.url ?? "", media.mediaType ?? undefined);
		}

		const deletedLikes = await db
			.delete(videoCommentLike)
			.where(
				commentIds.length > 0
					? inArray(videoCommentLike.videoCommentId, commentIds)
					: eq(videoCommentLike.videoCommentId, -1)
			)
			.returning();

		const deletedComment = await db
			.delete(videoComments)
			.where(commentIds.length > 0 ? inArray(videoComments.id, commentIds) : eq(videoComments.id, -1))
			.returning();

		return { deletedComment, deletedMedia, deletedLikes, deleteReply };
	}
};
