import { eq, and, inArray, sql } from "drizzle-orm";
import { Request, Response } from "express";
import { db } from "../../../db";
import { users, videoReplies } from "../../../db/schema";
import { videoReplyMedias } from "../../../db/models/video_reply_medias";
import { videoReplyLike } from "../../../db/models/video_reply_like";
import { deleteFromCloudinary, uploadToCloudinary } from "../../../db/cloudinary/cloundinaryFunction";

interface AuthenticatedRequest extends Request {
	user?: {
		userId: string;
		// add other user properties if needed
	};
}

export const getAllVideoRepliesForAComment = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: 1 };

		const videoReply = await db
			.select({
				id: videoReplies.id,
				userId: videoReplies.userId,
				videoCommentId: videoReplies.videoCommentId,
				description: videoReplies.description,
				createdAt: videoReplies.createdAt,
				updatedAt: videoReplies.updatedAt,
				mediaUrl: videoReplyMedias.url,
				mediaType: videoReplyMedias.mediaType,
				username: sql`${users.firstName} || ' ' || ${users.lastName}`,
				isLike: sql`CASE WHEN ${videoReplyLike.videoReplyId} IS NOT NULL THEN true ELSE false END`,
			})
			.from(videoReplies)
			.leftJoin(videoReplyMedias, eq(videoReplies.id, videoReplyMedias.videoReplyId))
			.leftJoin(
				videoReplyLike,
				and(eq(videoReplyLike.videoReplyId, videoReplies.id), eq(videoReplyLike.userId, Number(userId)))
			)
			.leftJoin(users, eq(videoReplies.userId, users.id))
			.where(eq(videoReplies.videoCommentId, Number(id)));

		if (!videoReply || videoReply.length === 0) {
			return res.status(200).json([]);
		}

		const repliesWithMedia = Object.values(
			videoReply.reduce((acc, reply) => {
				if (!acc[reply.id]) {
					acc[reply.id] = {
						id: reply.id,
						userId: reply.userId,
						videoCommentId: reply.videoCommentId,
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

export const postForumVideoReply = async (req: AuthenticatedRequest, res: Response) => {
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

		const insertReply = await db
			.insert(videoReplies)
			.values({
				userId: Number(userId),
				videoCommentId: Number(id),
				description,
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();

		let newVideoReplyMedia = null;
		if (public_id.length > 0 && mediaType.length > 0) {
			const values = [];
			for (let i = 0; i < public_id.length; i++) {
				values.push({
					userId: Number(userId),
					videoReplyId: insertReply[0].id,
					url: secure_url[i],
					urlForDeletion: public_id[i],
					mediaType: mediaType[i],
					createdAt: new Date(),
					updatedAt: new Date(),
				});
			}
			newVideoReplyMedia = await db.insert(videoReplyMedias).values(values).returning();
		}

		return res.status(201).json({
			success: true,
			reply: insertReply[0],
			newVideoReplyMedia,
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

export const likeForumVideoReply = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: 1 };

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		const like = await db
			.insert(videoReplyLike)
			.values({
				userId: Number(userId),
				videoReplyId: Number(id),
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

export const unlikeForumVideoReply = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: 1 };

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		const unlike = await db
			.delete(videoReplyLike)
			.where(and(eq(videoReplyLike.userId, Number(userId)), eq(videoReplyLike.videoReplyId, Number(id))))
			.returning();

		return res.status(200).json({ unlike });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const updateForumVideoReply = async (req: AuthenticatedRequest, res: Response) => {
	let public_id: string[] = [];
	let secure_url: string[] = [];
	let mediaType: ("image" | "video")[] = [];
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params;
		const { description, videosToRemove } = req.body;

		// Parse videosToRemove if it's a JSON string
		const doesUserOwnThisVideoReply = await db
			.select()
			.from(videoReplies)
			.where(and(eq(videoReplies.id, Number(id)), eq(videoReplies.userId, Number(userId))))
			.limit(1);

		if (doesUserOwnThisVideoReply.length === 0) {
			return res.status(404).json({ success: false, message: "Video reply not found" });
		}

		let videosToRemoveParse: { url: string }[] = [];
		if (videosToRemove) {
			try {
				videosToRemoveParse = typeof videosToRemove === "string" ? JSON.parse(videosToRemove) : videosToRemove;
			} catch (err) {
				return res.status(400).json({ success: false, message: "Invalid videosToRemove format" });
			}
		}

		// Handle new uploads
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

		// Check ownership

		// Remove media from Cloudinary and DB
		let deleteMedia = null;
		if (videosToRemoveParse && videosToRemoveParse.length > 0) {
			const deleteResults = await Promise.all(
				videosToRemoveParse.map(async (mediaToRemove) => {
					await deleteFromCloudinary(mediaToRemove.url ?? "", undefined);
					const deleted = await db
						.delete(videoReplyMedias)
						.where(
							and(
								eq(videoReplyMedias.videoReplyId, Number(id)),
								eq(videoReplyMedias.urlForDeletion, mediaToRemove.url)
							)
						)
						.returning();
					return deleted;
				})
			);
			deleteMedia = deleteResults.flat();
		}

		// Add new media if provided
		let newVideoReplyMedia = null;
		if (secure_url.length > 0) {
			const values = [];
			for (let i = 0; i < secure_url.length; i++) {
				values.push({
					videoReplyId: Number(id),
					url: secure_url[i],
					urlForDeletion: public_id[i],
					mediaType: mediaType[i],
					createdAt: new Date(),
					updatedAt: new Date(),
				});
			}
			newVideoReplyMedia = await db.insert(videoReplyMedias).values(values).returning();
		}

		// Update reply description
		const updateVideoReply = await db
			.update(videoReplies)
			.set({
				description,
				updatedAt: new Date(),
			})
			.where(eq(videoReplies.id, Number(id)))
			.returning();

		return res.status(200).json({ updateVideoReply, newVideoReplyMedia, deleteMedia });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const deleteForumVideoReply = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params;

		const replyRecord = await db
			.select()
			.from(videoReplies)
			.where(and(eq(videoReplies.id, Number(id)), eq(videoReplies.userId, Number(userId))))
			.limit(1);

		if (replyRecord.length === 0) {
			return res.status(404).json({ success: false, message: "Video reply not found" });
		}
		const result = await deleteVideoReply(Number(userId), Number(id), null);

		return res.status(200).json({
			success: true,
			message: "Video reply deleted successfully",
			...result,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const deleteVideoReply = async (userId: number, videoReplyId: number | null, commentId: number | null) => {
	if (videoReplyId === null && commentId === null) {
		throw new Error("Either videoReplyId or commentId must be provided");
	}

	if (videoReplyId && commentId === null) {
		const deletedMedia = await db
			.delete(videoReplyMedias)
			.where(eq(videoReplyMedias.videoReplyId, videoReplyId))
			.returning({ url: videoReplyMedias.url, mediaType: videoReplyMedias.mediaType });
		for (const media of deletedMedia) {
			await deleteFromCloudinary(media.url ?? "", media.mediaType ?? undefined);
		}
		const deleteLikeReply = await db
			.delete(videoReplyLike)
			.where(eq(videoReplyLike.videoReplyId, videoReplyId))
			.returning();
		const deletedReply = await db
			.delete(videoReplies)
			.where(and(eq(videoReplies.id, videoReplyId), eq(videoReplies.userId, userId)))
			.returning();
		return { deletedReply, deletedMedia, deleteLikeReply };
	}

	if (commentId && videoReplyId === null) {
		const getVideoReplyIdByCommentId = await db
			.select({ id: videoReplies.id })
			.from(videoReplies)
			.where(eq(videoReplies.videoCommentId, commentId));
		const videoReplyIds = getVideoReplyIdByCommentId.map((r) => r.id);
		const deletedMedia = await db
			.delete(videoReplyMedias)
			.where(
				videoReplyIds.length > 0
					? inArray(videoReplyMedias.videoReplyId, videoReplyIds)
					: eq(videoReplyMedias.videoReplyId, -1)
			)
			.returning({ url: videoReplyMedias.url, mediaType: videoReplyMedias.mediaType });
		for (const media of deletedMedia) {
			await deleteFromCloudinary(media.url ?? "", media.mediaType ?? undefined);
		}
		const deleteLikeReply = await db
			.delete(videoReplyLike)
			.where(
				videoReplyIds.length > 0
					? inArray(videoReplyLike.videoReplyId, videoReplyIds)
					: eq(videoReplyLike.videoReplyId, -1)
			)
			.returning();
		const deletedReply = await db
			.delete(videoReplies)
			.where(videoReplyIds.length > 0 ? inArray(videoReplies.id, videoReplyIds) : eq(videoReplies.id, -1))
			.returning();
		return { deletedReply, deletedMedia, deleteLikeReply };
	}
};
