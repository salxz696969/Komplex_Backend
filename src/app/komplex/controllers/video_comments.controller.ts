import { eq, and, inArray, sql, desc } from "drizzle-orm";
import { Request, Response } from "express";
import { db } from "../../../db";
import { users, videoReplies } from "../../../db/schema";
import { videoComments } from "../../../db/models/video_comments";
import { videoCommentMedias } from "../../../db/models/video_comment_medias";
import { videoCommentLike } from "../../../db/models/video_comment_like";
import { deleteFromCloudinary, uploadToCloudinary } from "../../../db/cloudinary/cloundinaryFunction";
import { deleteVideoReply } from "./video_replies.controller";
import { deleteFromCloudflare, uploadVideoToCloudflare } from "../../../db/cloudflare/cloudflareFunction";
import { redis } from "../../../db/redis/redisConfig";

interface AuthenticatedRequest extends Request {
	user?: {
		userId: string;
	};
}

export const getAllVideoCommentsForAVideo = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: 1 };
		const { page } = req.query;
		let pageNumber = Number(page);
		if (!page) {
			pageNumber = 1;
		}
		const limit = 20;
		const offset = (pageNumber - 1) * limit;

		const cacheKey = `videoComments:video:${id}:page:${pageNumber}`;
		const cached = await redis.get(cacheKey);

		let cachedComments: any[] = [];
		if (cached) {
			cachedComments = JSON.parse(cached).commentsWithMedia;
		}

		// --- Fetch dynamic fields fresh ---
		const dynamicData = await db
			.select({
				id: videoComments.id,
				likeCount: sql`COUNT(DISTINCT ${videoCommentLike.videoCommentId})`,
				isLike: sql`CASE WHEN ${videoCommentLike.videoCommentId} IS NOT NULL THEN true ELSE false END`,
			})
			.from(videoComments)
			.leftJoin(
				videoCommentLike,
				and(
					eq(videoCommentLike.videoCommentId, videoComments.id),
					eq(videoCommentLike.userId, Number(userId))
				)
			)
			.where(eq(videoComments.videoId, Number(id)))
			.groupBy(videoComments.id, videoCommentLike.videoCommentId)
			.offset(offset)
			.limit(limit);

		// If no cache → query full comments and cache static part
		if (!cachedComments.length) {
			const commentRows = await db
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
				})
				.from(videoComments)
				.leftJoin(videoCommentMedias, eq(videoComments.id, videoCommentMedias.videoCommentId))
				.leftJoin(users, eq(users.id, videoComments.userId))
				.leftJoin(videoCommentLike, eq(videoComments.id, videoCommentLike.videoCommentId))
				.where(eq(videoComments.videoId, Number(id)))
				.groupBy(
					videoComments.id,
					videoComments.userId,
					videoComments.videoId,
					videoComments.description,
					videoComments.createdAt,
					videoComments.updatedAt,
					videoCommentMedias.url,
					videoCommentMedias.mediaType,
					users.firstName,
					users.lastName
				)
				.orderBy(
					desc(sql`COUNT(DISTINCT ${videoCommentLike.id})`),
					desc(sql`CASE WHEN DATE(${videoComments.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END`),
					desc(videoComments.updatedAt)
				)
				.offset(offset)
				.limit(limit);

			cachedComments = Object.values(
				commentRows.reduce((acc, comment) => {
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
			);

			await redis.set(cacheKey, JSON.stringify({ commentsWithMedia: cachedComments }), { EX: 60 });
		}

		// Merge dynamic data with cached static data
		const commentsWithMedia = cachedComments.map((c) => {
			const dynamic = dynamicData.find((d) => d.id === c.id);
			return {
				...c,
				likeCount: Number(dynamic?.likeCount) || 0,
				isLike: !!dynamic?.isLike,
			};
		});

		return res.status(200).json({ commentsWithMedia, hasMore: commentsWithMedia.length === limit });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const postVideoComment = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: 1 };
		const { description } = req.body;
		const { id } = req.params;
		const limit = 20;

		if (!userId || !id || !description) {
			return res.status(400).json({ success: false, message: "Missing required fields" });
		}

		const [insertComment] = await db
			.insert(videoComments)
			.values({
				userId: Number(userId),
				videoId: Number(id),
				description,
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();

		let newCommentMedia: any[] = [];
		if (req.files) {
			for (const file of req.files as Express.Multer.File[]) {
				try {
					const uniqueKey = `${insertComment.id}-${crypto.randomUUID()}-${file.originalname}`;
					const url = await uploadVideoToCloudflare(uniqueKey, file.buffer, file.mimetype);
					const [media] = await db
						.insert(videoCommentMedias)
						.values({
							videoCommentId: insertComment.id,
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

		const [username] = await db
			.select({ firstName: users.firstName, lastName: users.lastName })
			.from(users)
			.where(eq(users.id, Number(userId)));
		const videoCommentWithMedia = {
			id: insertComment.id,
			userId: insertComment.userId,
			description: insertComment.description,
			createdAt: insertComment.createdAt,
			updatedAt: insertComment.updatedAt,
			username: username.firstName + " " + username.lastName,
			media: newCommentMedia.map((m) => ({
				url: m.url,
				type: m.mediaType,
			})),
		};

		let { currentCommentAmount, lastPage } = JSON.parse(
			(await redis.get(`videoComments:video:${id}:lastPage`)) ||
				JSON.stringify({ currentCommentAmount: 0, lastPage: 1 })
		);

		// Determine which page to add the new comment
		if (currentCommentAmount >= limit) {
			lastPage += 1;
			currentCommentAmount = 1;
		} else {
			currentCommentAmount += 1;
		}

		const cacheKey = `videoComments:video:${id}:page:${lastPage}`;
		const cached = await redis.get(cacheKey);

		if (cached) {
			const parsed = JSON.parse(cached);
			parsed.commentsWithMedia.push(videoCommentWithMedia);
			await redis.set(cacheKey, JSON.stringify(parsed), { EX: 600 });
		} else {
			await redis.set(cacheKey, JSON.stringify({ commentsWithMedia: [videoCommentWithMedia] }), { EX: 600 });
		}

		await redis.set(`videoComments:video:${id}:lastPage`, JSON.stringify({ currentCommentAmount, lastPage }), {
			EX: 600,
		});

		return res.status(201).json({
			success: true,
			comment: insertComment,
			newCommentMedia,
		});
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
		const { description, mediasToRemove } = req.body;

		const doesUserOwnThisComment = await db
			.select()
			.from(videoComments)
			.where(and(eq(videoComments.id, Number(id)), eq(videoComments.userId, Number(userId))))
			.limit(1);

		if (doesUserOwnThisComment.length === 0) {
			return res.status(404).json({ success: false, message: "Comment not found" });
		}

		let mediasToRemoveParse: { url: string }[] = [];
		if (mediasToRemove) {
			try {
				mediasToRemoveParse = typeof mediasToRemove === "string" ? JSON.parse(mediasToRemove) : mediasToRemove;
			} catch (err) {
				return res.status(400).json({ success: false, message: "Invalid mediasToRemove format" });
			}
		}

		let newCommentMedia: any[] = [];
		if (req.files) {
			for (const file of req.files as Express.Multer.File[]) {
				try {
					const uniqueKey = `${id}-${crypto.randomUUID()}-${file.originalname}`;
					const url = await uploadVideoToCloudflare(uniqueKey, file.buffer, file.mimetype);
					const [media] = await db
						.insert(videoCommentMedias)
						.values({
							videoCommentId: Number(id),
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
		if (mediasToRemoveParse && mediasToRemoveParse.length > 0) {
			const deleteResults = await Promise.all(
				mediasToRemoveParse.map(async (mediaToRemove: any) => {
					const urlForDeletion = await db
						.select({ urlForDeletion: videoCommentMedias.urlForDeletion })
						.from(videoCommentMedias)
						.where(eq(videoCommentMedias.url, mediaToRemove.url));
					let deleted = null;
					if (urlForDeletion[0]?.urlForDeletion) {
						await deleteFromCloudflare("komplex-image", urlForDeletion[0].urlForDeletion);
						deleted = await db
							.delete(videoCommentMedias)
							.where(
								and(
									eq(videoCommentMedias.videoCommentId, Number(id)),
									eq(videoCommentMedias.urlForDeletion, urlForDeletion[0].urlForDeletion)
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
			.update(videoComments)
			.set({
				description,
				updatedAt: new Date(),
			})
			.where(eq(videoComments.id, Number(id)))
			.returning();

		const pattern = `videoComments:video:${updateComment.videoId}:page:*`;
		let cursor = "0";

		do {
			const scanResult = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
			cursor = scanResult.cursor;
			const keys = scanResult.keys;

			if (keys.length > 0) {
				await Promise.all(keys.map((k) => redis.del(k)));
			}
		} while (cursor !== "0");

		await redis.del(`videoComments:video:${updateComment.videoId}:lastPage`);

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

		const doesUserOwnThisComment = await db
			.select()
			.from(videoComments)
			.where(and(eq(videoComments.id, Number(id)), eq(videoComments.userId, Number(userId))))
			.limit(1);

		if (doesUserOwnThisComment.length === 0) {
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
			deleteReply = await deleteVideoReply(Number(userId), null, Number(commentId));
		}

		const mediaToDelete = await db
			.select({ urlForDeletion: videoCommentMedias.urlForDeletion })
			.from(videoCommentMedias)
			.where(eq(videoCommentMedias.videoCommentId, commentId));

		for (const media of mediaToDelete) {
			await deleteFromCloudflare("komplex-image", media.urlForDeletion ?? "");
		}

		const deletedMedia = await db
			.delete(videoCommentMedias)
			.where(eq(videoCommentMedias.videoCommentId, commentId))
			.returning({ url: videoCommentMedias.url, mediaType: videoCommentMedias.mediaType });

		const deletedLikes = await db
			.delete(videoCommentLike)
			.where(eq(videoCommentLike.videoCommentId, commentId))
			.returning();

		const deletedComment = await db
			.delete(videoComments)
			.where(and(eq(videoComments.id, commentId), eq(videoComments.userId, userId)))
			.returning();

		const pattern = `videoComments:video:${deletedComment[0].videoId}:page:*`;
		let cursor = "0";

		do {
			const scanResult = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
			cursor = scanResult.cursor;
			const keys = scanResult.keys;

			if (keys.length > 0) {
				await Promise.all(keys.map((k) => redis.del(k)));
			}
		} while (cursor !== "0");

		await redis.del(`videoComments:video:${deletedComment[0].videoId}:lastPage`);

		return { deletedComment, deletedMedia, deletedLikes, deleteReply };
	}

	// Delete all comments for a videoId
	if (videoId && commentId === null) {
		const getCommentIdsByVideoId = await db
			.select({ id: videoComments.id })
			.from(videoComments)
			.where(eq(videoComments.videoId, videoId));
		const commentIds = getCommentIdsByVideoId.map((c) => c.id);

		const mediaToDelete = await db
			.select({ urlForDeletion: videoCommentMedias.urlForDeletion })
			.from(videoCommentMedias)
			.where(
				commentIds.length > 0
					? inArray(videoCommentMedias.videoCommentId, commentIds)
					: eq(videoCommentMedias.videoCommentId, -1)
			);

		for (const media of mediaToDelete) {
			await deleteFromCloudflare("komplex-image", media.urlForDeletion ?? "");
		}

		const deletedMedia = await db
			.delete(videoCommentMedias)
			.where(
				commentIds.length > 0
					? inArray(videoCommentMedias.videoCommentId, commentIds)
					: eq(videoCommentMedias.videoCommentId, -1)
			)
			.returning({ url: videoCommentMedias.url, mediaType: videoCommentMedias.mediaType });

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

		const pattern = `videoComments:video:${deletedComment[0].videoId}:page:*`;
		let cursor = "0";

		do {
			const scanResult = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
			cursor = scanResult.cursor;
			const keys = scanResult.keys;

			if (keys.length > 0) {
				await Promise.all(keys.map((k) => redis.del(k)));
			}
		} while (cursor !== "0");

		await redis.del(`videoComments:video:${deletedComment[0].videoId}:lastPage`);

		return { deletedComment, deletedMedia, deletedLikes };
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
