import { Request, Response } from "express";
import { deleteFromCloudinary, uploadToCloudinary } from "../../../db/cloudinary/cloundinaryFunction";
import { db } from "../../../db";
import { blogs, users, userSavedBlogs, userSavedVideos, videoComments, videoLikes, videos } from "../../../db/schema";
import { and, eq, sql } from "drizzle-orm";
import { deleteVideoCommentInternal } from "./video_comments.controller";

interface AuthenticatedRequest extends Request {
	user?: {
		userId: string;
		// add other user properties if needed
	};
}

export const postVideo = async (req: AuthenticatedRequest, res: Response) => {
	let secure_url = "";
	let public_id = "";
	let thumbnail_url = "";
	let duration = 0;
	let mediaType = "video";

	try {
		if (req.file) {
			if (!req.file.mimetype.startsWith("video")) {
				throw new Error("Only video files are allowed.");
			}
			const result = await uploadToCloudinary(req.file.buffer, "my_app_uploads", "auto");
			secure_url = (result as { secure_url: string }).secure_url;
			public_id = (result as { public_id: string }).public_id;
			duration = (result as { duration?: number }).duration ?? 0;
			thumbnail_url = (result as { thumbnail_url?: string }).thumbnail_url ?? "don't have one";
		} else {
			return res.status(400).json({ success: false, message: "No video file uploaded." });
		}

		const userId = req.user?.userId ?? "1";
		const { title, description, topic, type } = req.body;
		if (!title || !description || !topic || !type) {
			return res.status(400).json({ success: false, message: "Missing required fields" });
		}

		console.log({
			urlForDeletion: public_id,
			videoUrl: secure_url,
			title,
			description,
			duration: Math.floor(duration),
			topic,
			type,
			viewCount: 0,
			thumbnailUrl: thumbnail_url,
			userId: Number(userId),
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const newVideo = await db
			.insert(videos)
			.values({
				urlForDeletion: public_id,
				videoUrl: secure_url,
				title,
				description,
				duration: Math.floor(duration),
				topic,
				type,
				viewCount: 0,
				thumbnailUrl: thumbnail_url,
				userId: Number(userId),
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();

		return res.status(201).json({ success: true, video: newVideo });
	} catch (error) {
		if (public_id) {
			try {
				await deleteFromCloudinary(public_id, "video");
			} catch (err) {
				console.error("Failed to delete uploaded video:", err);
			}
		}
		return res.status(500).json({ success: false, error: (error as Error).message });
	}
};

export const getAllVideos = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: 1 };
		const { topic, type } = req.query;
		const conditions = [];
		if (topic) conditions.push(eq(videos.topic, topic as string));
		if (type) conditions.push(eq(videos.type, type as string));

		const videoRows = await db
			.select({
				id: videos.id,
				userId: videos.userId,
				title: videos.title,
				description: videos.description,
				duration: videos.duration,
				videoUrl: videos.videoUrl,
				thumbnailUrl: videos.thumbnailUrl,
				urlForDeletion: videos.urlForDeletion,
				viewCount: videos.viewCount,
				createdAt: videos.createdAt,
				updatedAt: videos.updatedAt,
				username: sql`${users.firstName} || ' ' || ${users.lastName}`,
				isSave: sql`CASE WHEN ${userSavedVideos.videoId} IS NOT NULL THEN true ELSE false END`,
				isLike: sql`CASE WHEN ${videoLikes.videoId} IS NOT NULL THEN true ELSE false END`,
				likeCount: sql`COUNT(DISTINCT ${videoLikes.id})`,
				saveCount: sql`COUNT(DISTINCT ${userSavedVideos.id})`,
			})
			.from(videos)
			.leftJoin(users, eq(videos.userId, users.id))
			.leftJoin(
				userSavedVideos,
				and(eq(userSavedVideos.videoId, videos.id), eq(userSavedVideos.userId, Number(userId)))
			)
			.leftJoin(videoLikes, and(eq(videoLikes.videoId, videos.id), eq(videoLikes.userId, Number(userId))))
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.groupBy(
				videos.id,
				users.firstName,
				users.lastName,
				userSavedVideos.videoId,
				videoLikes.videoId,
				userSavedVideos.id,
				videoLikes.id
			);

		return res.status(200).json({ videos: videoRows });
	} catch (error) {}
};

export const getVideoById = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: 1 };
		const videoId = Number(req.params.id);

		if (!videoId) {
			return res.status(400).json({ success: false, message: "Missing video id" });
		}

		const videoRow = await db
			.select({
				id: videos.id,
				userId: videos.userId,
				title: videos.title,
				description: videos.description,
				duration: videos.duration,
				videoUrl: videos.videoUrl,
				thumbnailUrl: videos.thumbnailUrl,
				urlForDeletion: videos.urlForDeletion,
				viewCount: videos.viewCount,
				createdAt: videos.createdAt,
				updatedAt: videos.updatedAt,
				username: sql`${users.firstName} || ' ' || ${users.lastName}`,
				isSave: sql`CASE WHEN ${userSavedVideos.videoId} IS NOT NULL THEN true ELSE false END`,
				isLike: sql`CASE WHEN ${videoLikes.videoId} IS NOT NULL THEN true ELSE false END`,
				likeCount: sql`COUNT(DISTINCT ${videoLikes.id})`,
				saveCount: sql`COUNT(DISTINCT ${userSavedVideos.id})`,
			})
			.from(videos)
			.leftJoin(users, eq(videos.userId, users.id))
			.leftJoin(
				userSavedVideos,
				and(eq(userSavedVideos.videoId, videos.id), eq(userSavedVideos.userId, Number(userId)))
			)
			.leftJoin(videoLikes, and(eq(videoLikes.videoId, videos.id), eq(videoLikes.userId, Number(userId))))
			.where(eq(videos.id, videoId))
			.groupBy(
				videos.id,
				users.firstName,
				users.lastName,
				userSavedVideos.videoId,
				videoLikes.videoId,
				userSavedVideos.id,
				videoLikes.id
			);

		if (!videoRow || videoRow.length === 0) {
			return res.status(404).json({ success: false, message: "Video not found" });
		}

		return res.status(200).json({ video: videoRow[0] });
	} catch (error) {}
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
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params;
		const { title, description, type, topic, photosToRemove, secure_url, public_id } = req.body;
		console.log("Request body:", {
			title,
			description,
			type,
			topic,
			photosToRemove,
		});

		// ! removed parsing because already array

		let photosToRemoveParse: { url: string }[] = [];
		if (photosToRemove) {
			try {
				photosToRemoveParse = JSON.parse(photosToRemove);
				console.log("Photos to remove:", photosToRemoveParse);
			} catch (err) {
				console.error("Error parsing photosToRemove:", err);
				return res.status(400).json({ success: false, message: "Invalid photosToRemove format" });
			}
		}

		console.log("Checking video ownership...");
		const doesUserOwnThisVideo = await db
			.select()
			.from(videos)
			.where(and(eq(videos.id, Number(id)), eq(videos.userId, Number(userId))))
			.limit(1);
		if (doesUserOwnThisVideo.length === 0) {
			console.log("Video not found or user does not own video");
			return res.status(404).json({ success: false, message: "Video not found" });
		}

		if (photosToRemove) {
			try {
				for (const photo of photosToRemove) {
					await deleteFromCloudinary(photo.url);
				}
			} catch (error) {
				console.error("Error deleting photos from Cloudinary:", error);
				return res.status(500).json({ success: false, error: (error as Error).message });
			}
		}

		console.log("Updating video content...");
		const updateVideo = await db
			.update(videos)
			.set({
				title,
				description,
				type,
				topic,
				videoUrl: secure_url,
				urlForDeletion: public_id,
				updatedAt: new Date(),
			})
			.where(eq(videos.id, Number(id)))
			.returning();
		console.log("Video updated:", updateVideo);

		return res.status(200).json({ updateVideo });
	} catch (error) {
		console.error("Error updating video:", error);
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const deleteVideo = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params;

		// Check ownership
		const videoRecord = await db
			.select()
			.from(videos)
			.where(and(eq(videos.id, Number(id)), eq(videos.userId, Number(userId))))
			.limit(1);

		if (!videoRecord || videoRecord.length === 0) {
			return res.status(404).json({ success: false, message: "Video not found or unauthorized" });
		}

		const doesThisVideoHasComments = await db
			.select()
			.from(videoComments)
			.where(eq(videoComments.videoId, Number(id)))
			.limit(1);

			let deleteComments = null;
		if(doesThisVideoHasComments.length > 0) {
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

		// Delete from Cloudinary
		const video = videoRecord[0];
		if (video.urlForDeletion) {
			try {
				await deleteFromCloudinary(video.urlForDeletion, "video");
			} catch (err) {
				console.error("Failed to delete video from Cloudinary:", err);
			}
		}

		// Delete video record
		const deletedVideo = await db
			.delete(videos)
			.where(and(eq(videos.id, Number(id)), eq(videos.userId, Number(userId))))
			.returning();

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
