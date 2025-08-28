import { Request, Response } from "express";
import { db } from "../../../db";
import { blogs, users, userSavedBlogs, userSavedVideos, videoComments, videoLikes, videos } from "../../../db/schema";
import { and, eq, sql, desc } from "drizzle-orm";
import { deleteVideoCommentInternal } from "./video_comments.controller";
import {
	deleteFromCloudflare,
	uploadImageToCloudflare,
	uploadVideoToCloudflare,
} from "../../../db/cloudflare/cloudflareFunction";
import fs from "fs";
import { redis } from "../../../db/redis/redisConfig";
interface AuthenticatedRequest extends Request {
	user?: {
		userId: string;
		// add other user properties if needed
	};
}

export const postVideo = async (req: AuthenticatedRequest, res: Response) => {
	let videoFile: Express.Multer.File | undefined;
	let thumbnailFile: Express.Multer.File | undefined;

	try {
		const userId = req.user?.userId ?? "1";
		const { title, description, topic, type } = req.body;

		if (!title || !description || !topic || !type) {
			return res.status(400).json({ success: false, message: "Missing required fields" });
		}

		if (req.files && typeof req.files === "object" && "video" in req.files && "image" in req.files) {
			videoFile = (req.files as { [fieldname: string]: Express.Multer.File[] }).video[0];
			thumbnailFile = (req.files as { [fieldname: string]: Express.Multer.File[] }).image[0];
		} else {
			return res.status(400).json({ error: "Files not uploaded correctly" });
		}

		const uniqueKey = `${videoFile.filename}-${crypto.randomUUID()}-${thumbnailFile.filename}`;

		const videoUrl = await uploadVideoToCloudflare(
			uniqueKey,
			await fs.promises.readFile(videoFile.path),
			videoFile.mimetype
		);

		const thumbnailUrl = await uploadImageToCloudflare(
			uniqueKey,
			await fs.promises.readFile(thumbnailFile.path),
			thumbnailFile.mimetype
		);

		const newVideo = await db
			.insert(videos)
			.values({
				videoUrlForDeletion: uniqueKey,
				videoUrl,
				title,
				description,
				duration: 100,
				topic,
				type,
				viewCount: 0,
				thumbnailUrl,
				thumbnailUrlForDeletion: uniqueKey,
				userId: Number(userId),
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();

		const [username] = await db
			.select({ firstName: users.firstName, lastName: users.lastName })
			.from(users)
			.where(eq(users.id, Number(userId)));
		const videoWithMedia = {
			id: newVideo[0].id,
			userId: newVideo[0].userId,
			title: newVideo[0].title,
			description: newVideo[0].description,
			type: newVideo[0].type,
			topic: newVideo[0].topic,
			viewCount: newVideo[0].viewCount,
			createdAt: newVideo[0].createdAt,
			updatedAt: newVideo[0].updatedAt,
			username: username.firstName + " " + username.lastName,
			videoUrl: newVideo[0].videoUrl,
			thumbnailUrl: newVideo[0].thumbnailUrl,
		};
		const redisKey = `videos:${newVideo[0].id}`;

		await redis.set(redisKey, JSON.stringify(videoWithMedia), { EX: 600 });

		return res.status(201).json({ success: true, video: newVideo });
	} catch (error) {
		console.error("Error uploading file or saving media:", error);
		return res.status(500).json({ success: false, error: (error as Error).message });
	} finally {
		if (videoFile) await fs.promises.unlink(videoFile.path).catch(() => {});
		if (thumbnailFile) await fs.promises.unlink(thumbnailFile.path).catch(() => {});
	}
};

export const getAllVideos = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { topic, type, page } = req.query;
		const { userId } = req.user ?? { userId: 1 };
		const conditions = [];
		if (topic) conditions.push(eq(videos.topic, topic as string));
		if (type) conditions.push(eq(videos.type, type as string));

		const pageNumber = Number(page) || 1;
		const limit = 20;
		const offset = (pageNumber - 1) * limit;

		const cacheKey = `videos:type=${type || "all"}:topic=${topic || "all"}:page=${pageNumber}`;
		const cached = await redis.get(cacheKey);

		let cachedVideos: any[] = [];
		if (cached) {
			cachedVideos = JSON.parse(cached).videosWithMedia;
			console.log("data from redis");
		}

		// --- Fetch dynamic fields fresh ---
		const dynamicData = await db
			.select({
				id: videos.id,
				viewCount: videos.viewCount,
				likeCount: sql`COUNT(DISTINCT ${videoLikes.videoId})`,
				saveCount: sql`COUNT(DISTINCT ${userSavedVideos.videoId})`,
				isLike: sql`CASE WHEN ${videoLikes.videoId} IS NOT NULL THEN true ELSE false END`,
				isSave: sql`CASE WHEN ${userSavedVideos.videoId} IS NOT NULL THEN true ELSE false END`,
			})
			.from(videos)
			.leftJoin(videoLikes, and(eq(videoLikes.videoId, videos.id), eq(videoLikes.userId, Number(userId))))
			.leftJoin(userSavedVideos, and(eq(userSavedVideos.videoId, videos.id), eq(userSavedVideos.userId, Number(userId))))
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.groupBy(videos.id, videoLikes.videoId, userSavedVideos.videoId)
			.offset(offset)
			.limit(limit);

		// If no cache → query full videos and cache static part
		if (!cachedVideos.length) {
			const videoRows = await db
				.select({
					id: videos.id,
					userId: videos.userId,
					title: videos.title,
					description: videos.description,
					type: videos.type,
					topic: videos.topic,
					duration: videos.duration,
					videoUrl: videos.videoUrl,
					thumbnailUrl: videos.thumbnailUrl,
					createdAt: videos.createdAt,
					updatedAt: videos.updatedAt,
					username: sql`${users.firstName} || ' ' || ${users.lastName}`,
					viewCount: videos.viewCount,
				})
				.from(videos)
				.leftJoin(users, eq(videos.userId, users.id))
				.where(conditions.length > 0 ? and(...conditions) : undefined)
				.orderBy(
					desc(sql`CASE WHEN DATE(${videos.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END`),
					desc(videos.updatedAt),
					desc(videos.viewCount),
					desc(sql`(SELECT COUNT(*) FROM ${videoLikes} WHERE ${videoLikes.videoId} = ${videos.id})`)
				)
				.offset(offset)
				.limit(limit);

			cachedVideos = videoRows.map((video) => ({
				id: video.id,
				userId: video.userId,
				title: video.title,
				description: video.description,
				type: video.type,
				topic: video.topic,
				duration: video.duration,
				videoUrl: video.videoUrl,
				thumbnailUrl: video.thumbnailUrl,
				createdAt: video.createdAt,
				updatedAt: video.updatedAt,
				username: video.username,
				viewCount: video.viewCount,
			}));

			console.log("data from db");
			await redis.set(cacheKey, JSON.stringify({ videosWithMedia: cachedVideos }), { EX: 600 });
		}

		// Merge dynamic data with cached static data
		const videosWithMedia = cachedVideos.map((v) => {
			const dynamic = dynamicData.find((d) => d.id === v.id);
			return {
				...v,
				viewCount: (dynamic?.viewCount ?? 0) + 1,
				likeCount: Number(dynamic?.likeCount) || 0,
				saveCount: Number(dynamic?.saveCount) || 0,
				isLike: !!dynamic?.isLike,
				isSave: !!dynamic?.isSave,
			};
		});

		return res.status(200).json({ videosWithMedia, hasMore: videosWithMedia.length === limit });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const getVideoById = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: "1" };
		const cacheKey = `videos:${id}`;

		// Try Redis first (only static info)
		const cached = await redis.get(cacheKey);
		let videoData;
		if (cached) {
			videoData = JSON.parse(cached);
			console.log("data from redis");
		} else {
			// Fetch video static info
			const video = await db
				.select({
					id: videos.id,
					userId: videos.userId,
					title: videos.title,
					description: videos.description,
					type: videos.type,
					topic: videos.topic,
					duration: videos.duration,
					videoUrl: videos.videoUrl,
					thumbnailUrl: videos.thumbnailUrl,
					createdAt: videos.createdAt,
					updatedAt: videos.updatedAt,
					viewCount: videos.viewCount,
					username: sql`${users.firstName} || ' ' || ${users.lastName}`,
				})
				.from(videos)
				.leftJoin(users, eq(videos.userId, users.id))
				.where(eq(videos.id, Number(id)));

			if (!video || video.length === 0) {
				return res.status(404).json({ success: false, message: "Video not found" });
			}

			// Increment view count
			await db
				.update(videos)
				.set({ viewCount: (video[0]?.viewCount ?? 0) + 1, updatedAt: new Date() })
				.where(eq(videos.id, Number(id)));

			// Build static cacheable object
			videoData = {
				id: video[0].id,
				userId: video[0].userId,
				title: video[0].title,
				description: video[0].description,
				type: video[0].type,
				topic: video[0].topic,
				duration: video[0].duration,
				videoUrl: video[0].videoUrl,
				thumbnailUrl: video[0].thumbnailUrl,
				createdAt: video[0].createdAt,
				updatedAt: new Date(),
				username: video[0].username,
			};
			console.log("data from db");

			// Cache static data only
			await redis.set(cacheKey, JSON.stringify(videoData), { EX: 600 });
		}

		// Always fetch dynamic fields fresh
		const dynamic = await db
			.select({
				viewCount: videos.viewCount,
				likeCount: sql`COUNT(DISTINCT ${videoLikes.id})`,
				saveCount: sql`COUNT(DISTINCT ${userSavedVideos.id})`,
				isLike: sql`CASE WHEN ${videoLikes.videoId} IS NOT NULL THEN true ELSE false END`,
				isSave: sql`CASE WHEN ${userSavedVideos.videoId} IS NOT NULL THEN true ELSE false END`,
			})
			.from(videos)
			.leftJoin(videoLikes, and(eq(videoLikes.videoId, videos.id), eq(videoLikes.userId, Number(userId))))
			.leftJoin(userSavedVideos, and(eq(userSavedVideos.videoId, videos.id), eq(userSavedVideos.userId, Number(userId))))
			.where(eq(videos.id, Number(id)))
			.groupBy(videos.id, videoLikes.videoId, userSavedVideos.videoId);

		const videoWithMedia = {
			...videoData,
			viewCount: (dynamic[0]?.viewCount ?? 0) + 1,
			likeCount: Number(dynamic[0]?.likeCount) || 0,
			saveCount: Number(dynamic[0]?.saveCount) || 0,
			isLike: !!dynamic[0]?.isLike,
			isSave: !!dynamic[0]?.isSave,
		};

		return res.status(200).json({ video: videoWithMedia });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const likeVideo = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: 1 };

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		const like = await db
			.insert(videoLikes)
			.values({
				userId: Number(userId),
				videoId: Number(id),
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

export const unlikeVideo = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: 1 };

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		const unlike = await db
			.delete(videoLikes)
			.where(and(eq(videoLikes.userId, Number(userId)), eq(videoLikes.videoId, Number(id))))
			.returning();

		return res.status(200).json({ unlike });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const saveVideo = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: "1" };

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		const videoToSave = await db.insert(userSavedVideos).values({
			userId: Number(userId),
			videoId: Number(id),
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		return res.status(200).json({
			success: true,
			message: "Video saved successfully",
			video: videoToSave,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const unsaveVideo = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: "1" };

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		const videoToUnsave = await db
			.delete(userSavedVideos)
			.where(and(eq(userSavedVideos.userId, Number(userId)), eq(userSavedVideos.videoId, Number(id))))
			.returning();

		if (!videoToUnsave || videoToUnsave.length === 0) {
			return res.status(404).json({ success: false, message: "Video not found" });
		}

		return res.status(200).json({
			success: true,
			message: "Video unsaved successfully",
			video: videoToUnsave,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const updateVideo = async (req: AuthenticatedRequest, res: Response) => {
	let videoFile: Express.Multer.File | undefined;
	let thumbnailFile: Express.Multer.File | undefined;

	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params;
		const { title, description, type, topic } = req.body;

		if (!id || !title || !description || !type || !topic) {
			return res.status(400).json({ success: false, message: "Missing required fields" });
		}

		const [doesUserOwnThisVideo] = await db
			.select()
			.from(videos)
			.where(and(eq(videos.id, Number(id)), eq(videos.userId, Number(userId))))
			.limit(1);

		if (!doesUserOwnThisVideo) {
			return res.status(404).json({ success: false, message: "Video not found" });
		}

		if (req.files && typeof req.files === "object" && "video" in req.files && "image" in req.files) {
			videoFile = (req.files as { [fieldname: string]: Express.Multer.File[] }).video[0];
			thumbnailFile = (req.files as { [fieldname: string]: Express.Multer.File[] }).image[0];
		}

		const uniqueKey =
			videoFile && thumbnailFile
				? `${videoFile.filename}-${crypto.randomUUID()}-${thumbnailFile.filename}`
				: crypto.randomUUID();

		let newVideoUrl: string | null = null;
		if (videoFile) {
			const [videoUrlForDeletionForThisVideo] = await db
				.select({ videoUrlForDeletion: videos.videoUrlForDeletion })
				.from(videos)
				.where(eq(videos.id, Number(id)))
				.limit(1);

			await deleteFromCloudflare("komplex-video", videoUrlForDeletionForThisVideo.videoUrlForDeletion ?? "");
			newVideoUrl = await uploadVideoToCloudflare(
				uniqueKey,
				await fs.promises.readFile(videoFile.path),
				videoFile.mimetype
			);
		}

		let newThumbnailUrl: string | null = null;
		if (thumbnailFile) {
			const [thumbnailUrlForDeletionForThisVideo] = await db
				.select({ thumbnailUrlForDeletion: videos.thumbnailUrlForDeletion })
				.from(videos)
				.where(eq(videos.id, Number(id)))
				.limit(1);

			await deleteFromCloudflare(
				"komplex-video",
				thumbnailUrlForDeletionForThisVideo.thumbnailUrlForDeletion ?? ""
			);
			newThumbnailUrl = await uploadImageToCloudflare(
				uniqueKey,
				await fs.promises.readFile(thumbnailFile.path),
				thumbnailFile.mimetype
			);
		}

		const updateData: Partial<typeof videos.$inferInsert> = {
			title,
			description,
			type,
			topic,
			updatedAt: new Date(),
		};

		if (newVideoUrl) {
			updateData.videoUrl = newVideoUrl;
			updateData.videoUrlForDeletion = uniqueKey;
		}

		if (newThumbnailUrl) {
			updateData.thumbnailUrl = newThumbnailUrl;
			updateData.thumbnailUrlForDeletion = uniqueKey;
		}

		const [updateVideoResult] = await db
			.update(videos)
			.set(updateData)
			.where(eq(videos.id, Number(id)))
			.returning();

		// Fetch updated video with media and username
		const video = await db
			.select({
				id: videos.id,
				userId: videos.userId,
				title: videos.title,
				description: videos.description,
				type: videos.type,
				topic: videos.topic,
				duration: videos.duration,
				videoUrl: videos.videoUrl,
				thumbnailUrl: videos.thumbnailUrl,
				createdAt: videos.createdAt,
				updatedAt: videos.updatedAt,
				username: sql`${users.firstName} || ' ' || ${users.lastName}`,
				viewCount: videos.viewCount,
			})
			.from(videos)
			.leftJoin(users, eq(videos.userId, users.id))
			.where(eq(videos.id, Number(id)));

		const videoWithMedia = {
			id: video[0].id,
			userId: video[0].userId,
			title: video[0].title,
			description: video[0].description,
			type: video[0].type,
			topic: video[0].topic,
			duration: video[0].duration,
			videoUrl: video[0].videoUrl,
			thumbnailUrl: video[0].thumbnailUrl,
			createdAt: video[0].createdAt,
			updatedAt: video[0].updatedAt,
			username: video[0].username,
			viewCount: video[0].viewCount,
		};

		// Update Redis cache
		await redis.del(`videos:${id}`);
		await redis.set(`videos:${id}`, JSON.stringify(videoWithMedia), { EX: 600 });

		return res.status(200).json({ success: true, updateVideo: updateVideoResult });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	} finally {
		// cleanup temp files
		if (videoFile) await fs.promises.unlink(videoFile.path).catch(() => {});
		if (thumbnailFile) await fs.promises.unlink(thumbnailFile.path).catch(() => {});
	}
};

export const deleteVideo = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params;

		// Check ownership
		const [doesThisUserOwnThisVideo] = await db
			.select({
				videoUrlForDeletion: videos.videoUrlForDeletion,
				thumbnailUrlForDeletion: videos.thumbnailUrlForDeletion,
			})
			.from(videos)
			.where(and(eq(videos.id, Number(id)), eq(videos.userId, Number(userId))));

		if (!doesThisUserOwnThisVideo) {
			return res.status(404).json({ success: false, message: "Video not found or unauthorized" });
		}

		const [doesThisVideoHasComments] = await db
			.select()
			.from(videoComments)
			.where(eq(videoComments.videoId, Number(id)))
			.limit(1);

		let deleteComments = null;
		if (doesThisVideoHasComments) {
			// If the video has comments, we need to delete them as well
			deleteComments = await deleteVideoCommentInternal(Number(userId), null, Number(id));
		}

		// Delete likes
		const deletedLikes = await db
			.delete(videoLikes)
			.where(eq(videoLikes.videoId, Number(id)))
			.returning();

		// Delete saves
		const deletedSaves = await db
			.delete(userSavedVideos)
			.where(eq(userSavedVideos.videoId, Number(id)))
			.returning();

		// Delete from Cloudflare
		if (doesThisUserOwnThisVideo.videoUrlForDeletion) {
			try {
				await deleteFromCloudflare("komplex-video", doesThisUserOwnThisVideo.videoUrlForDeletion);
			} catch (err) {
				console.error("Failed to delete video from Cloudflare:", err);
			}
		}

		if (doesThisUserOwnThisVideo.thumbnailUrlForDeletion) {
			try {
				await deleteFromCloudflare("komplex-image", doesThisUserOwnThisVideo.thumbnailUrlForDeletion);
			} catch (err) {
				console.error("Failed to delete thumbnail from Cloudflare:", err);
			}
		}

		// Delete video record
		const deletedVideo = await db
			.delete(videos)
			.where(and(eq(videos.id, Number(id)), eq(videos.userId, Number(userId))))
			.returning();

		// Remove from Redis cache
		await redis.del(`videos:${id}`);

		return res.status(200).json({
			success: true,
			message: "Video deleted successfully",
			deletedVideo,
			deletedLikes,
			deletedSaves,
			deleteComments,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};
