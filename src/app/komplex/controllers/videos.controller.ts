import { Request, Response } from "express";
import { db } from "../../../db/index.js";
import {
	blogs,
	choices,
	exercises,
	followers,
	questions as questionsTable,
	users,
	userSavedBlogs,
	userSavedVideos,
	userVideoHistory,
	videoComments,
	videoLikes,
	videos,
} from "../../../db/schema.js";
import { and, eq, sql, desc, inArray } from "drizzle-orm";
import { deleteVideoCommentInternal } from "./video_comments.controller.js";
import {
	deleteFromCloudflare,
	uploadImageToCloudflare,
	uploadVideoToCloudflare,
} from "../../../db/cloudflare/cloudflareFunction.js";
import fs from "fs";
import { redis } from "../../../db/redis/redisConfig.js";
import { AuthenticatedRequest } from "../../../types/request.js";

// export const postVideo = async (req: AuthenticatedRequest, res: Response) => {
//   let videoFile: Express.Multer.File | undefined;
//   let thumbnailFile: Express.Multer.File | undefined;

//   try {
//     const userId = req.user?.userId ?? "1";
//     const { title, description, topic, type } = req.body;

//     if (!title || !description || !topic || !type) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Missing required fields" });
//     }

//     if (
//       req.files &&
//       typeof req.files === "object" &&
//       "video" in req.files &&
//       "image" in req.files
//     ) {
//       videoFile = (req.files as { [fieldname: string]: Express.Multer.File[] })
//         .video[0];
//       thumbnailFile = (
//         req.files as { [fieldname: string]: Express.Multer.File[] }
//       ).image[0];
//     } else {
//       return res.status(400).json({ error: "Files not uploaded correctly" });
//     }

//     const uniqueKey = `${videoFile.filename}-${crypto.randomUUID()}-${
//       thumbnailFile.filename
//     }`;

//     const videoUrl = await uploadVideoToCloudflare(
//       uniqueKey,
//       await fs.promises.readFile(videoFile.path),
//       videoFile.mimetype
//     );

//     const thumbnailUrl = await uploadImageToCloudflare(
//       uniqueKey,
//       await fs.promises.readFile(thumbnailFile.path),
//       thumbnailFile.mimetype
//     );

//     const newVideo = await db
//       .insert(videos)
//       .values({
//         videoUrlForDeletion: uniqueKey,
//         videoUrl,
//         title,
//         description,
//         duration: 100,
//         topic,
//         type,
//         viewCount: 0,
//         thumbnailUrl,
//         thumbnailUrlForDeletion: uniqueKey,
//         userId: Number(userId),
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       })
//       .returning();

//     return res.status(201).json({ success: true, video: newVideo });
//   } catch (error) {
//     console.error("Error uploading file or saving media:", error);
//     return res
//       .status(500)
//       .json({ success: false, error: (error as Error).message });
//   } finally {
//     if (videoFile) await fs.promises.unlink(videoFile.path).catch(() => {});
//     if (thumbnailFile)
//       await fs.promises.unlink(thumbnailFile.path).catch(() => {});
//   }
// };

export const postVideoPresigned = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: 1 };
		console.log(userId);
		const { videoKey, title, description, topic, type, thumbnailKey, questions } = req.body;

		const videoUrl = `${process.env.R2_VIDEO_PUBLIC_URL}/${videoKey}`;
		const thumbnailUrl = `${process.env.R2_PHOTO_PUBLIC_URL}/${thumbnailKey}`;

		const [newVideo] = await db
			.insert(videos)
			.values({
				videoUrlForDeletion: videoKey,
				videoUrl,
				thumbnailUrlForDeletion: thumbnailKey,
				thumbnailUrl,
				title,
				description,
				topic,
				type,
				viewCount: 0,
				duration: 0,
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
			id: newVideo.id,
			userId: newVideo.userId,
			title: newVideo.title,
			description: newVideo.description,
			type: newVideo.type,
			topic: newVideo.topic,
			viewCount: newVideo.viewCount,
			createdAt: newVideo.createdAt,
			updatedAt: newVideo.updatedAt,
			username: username.firstName + " " + username.lastName,
			videoUrl: newVideo.videoUrl,
			thumbnailUrl: newVideo.thumbnailUrl,
		};
		const redisKey = `videos:${newVideo.id}`;

		await redis.set(redisKey, JSON.stringify(videoWithMedia), { EX: 600 });

		// Create exercise for video quiz
		console.log(questions);

		// questions
		// :
		// [{title: "1+1", choices: [{text: "2", isCorrect: true}, {text: "3", isCorrect: false}]}]
		// 0
		// :
		// {title: "1+1", choices: [{text: "2", isCorrect: true}, {text: "3", isCorrect: false}]}

		if (questions.length > 0) {
			const newExercise = await db
				.insert(exercises)
				.values({
					videoId: newVideo.id,
					title: `Quiz for ${title}`,
					description: `Multiple choice questions for the video: ${title}`,
					subject: topic || "General",
					grade: "All",
					duration: 0,
					userId: Number(userId),
					createdAt: new Date(),
					updatedAt: new Date(),
				})
				.returning();
			let exercise = {
				title: `Quiz for ${title}`,
				description: `Multiple choice questions for the video: ${title}`,
				subject: topic || "General",
				grade: "All",
			} as {
				title: string;
				description: string;
				subject: string;
				grade: string;
				questions: {
					title: string | null;
					questionType: string | null;
					section: string | null;
					imageUrl: string | null;
					choices?: { text: string; isCorrect: boolean }[];
				}[];
			};

			let questionsForExercise = [];
			for (const question of questions) {
				const newQuestion = await db
					.insert(questionsTable)
					.values({
						exerciseId: newExercise[0].id,
						title: question.title,
						questionType: "",
						section: "",
						imageUrl: "",
						userId: Number(userId),
						createdAt: new Date(),
						updatedAt: new Date(),
					})
					.returning();
				let questionToAdd = {
					title: newQuestion[0].title,
					questionType: newQuestion[0].questionType,
					section: newQuestion[0].section,
					imageUrl: newQuestion[0].imageUrl,
				} as {
					title: string | null;
					questionType: string | null;
					section: string | null;
					imageUrl: string | null;
					choices: { text: string; isCorrect: boolean }[];
				};
				let choicesForQuestion = [];
				for (const choice of question.choices) {
					await db.insert(choices).values({
						questionId: newQuestion[0].id,
						text: choice.text,
						isCorrect: choice.isCorrect,
						createdAt: new Date(),
						updatedAt: new Date(),
					});
					choicesForQuestion.push({
						text: choice.text,
						isCorrect: choice.isCorrect,
					});
				}
				questionToAdd = { ...questionToAdd, choices: choicesForQuestion };
				questionsForExercise.push(questionToAdd);
			}
			exercise = { ...exercise, questions: questionsForExercise };
			const cacheKey = `exercises:videoId:${newVideo.id}`;
			await redis.set(cacheKey, JSON.stringify(exercise), { EX: 600 });
		}

		return res.status(201).json({ success: true, video: newVideo });
	} catch (error) {
		console.error("postVideoPresigned error:", error);
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
			details: error instanceof Error ? error.stack : "Unknown error",
		});
	}
};

export const getAllVideos = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { type, topic, page } = req.query;
		const { userId } = req.user ?? { userId: 1 };
		const conditions = [];
		if (type) conditions.push(eq(videos.type, type as string));
		if (topic) conditions.push(eq(videos.topic, topic as string));

		const pageNumber = Number(page) || 1;
		const limit = 20;
		const offset = (pageNumber - 1) * limit;

		// 1️⃣ Fetch filtered video IDs from DB
		// Get videos from followed users
		const followedUsersVideosId = await db
			.select({ id: videos.id })
			.from(videos)
			.where(
				inArray(
					videos.userId,
					db
						.select({ followedId: followers.followedId })
						.from(followers)
						.where(eq(followers.userId, Number(userId)))
				)
			)
			.orderBy(
				desc(sql`CASE WHEN DATE(${videos.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END`),
				desc(videos.viewCount),
				desc(videos.updatedAt),
				desc(sql`(SELECT COUNT(*) FROM ${videoLikes} WHERE ${videoLikes.videoId} = ${videos.id})`)
			)
			.limit(5);

		// 1️⃣ Fetch filtered video IDs from DB
		const videoIds = await db
			.select({ id: videos.id })
			.from(videos)
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(
				desc(sql`CASE WHEN DATE(${videos.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END`),
				desc(videos.viewCount),
				desc(videos.updatedAt),
				desc(sql`(SELECT COUNT(*) FROM ${videoLikes} WHERE ${videoLikes.videoId} = ${videos.id})`)
			)
			.offset(offset)
			.limit(limit);

		const videoIdRows = Array.from(
			new Set([...followedUsersVideosId.map((f) => f.id), ...videoIds.map((f) => f.id)])
		).map((id) => ({ id }));

		if (!videoIdRows.length) return res.status(200).json({ videosWithMedia: [], hasMore: false });

		// 2️⃣ Fetch videos from Redis in one call
		const cachedResults = (await redis.mGet(videoIdRows.map((v) => `videos:${v.id}`))) as (string | null)[];
		const hits: any[] = [];
		const missedIds: number[] = [];

		if (cachedResults.length > 0) {
			cachedResults.forEach((item, idx) => {
				if (item) hits.push(JSON.parse(item));
				else missedIds.push(videoIdRows[idx].id);
			});
		}

		// 3️⃣ Fetch missing videos from DB
		let missedVideos: any[] = [];
		if (missedIds.length > 0) {
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
				.where(inArray(videos.id, missedIds));

			for (const video of videoRows) {
				const formatted = {
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
				};
				missedVideos.push(formatted);
				await redis.set(`videos:${video.id}`, JSON.stringify(formatted), { EX: 600 });
			}
		}

		// 4️⃣ Merge hits and missed videos, preserving original order
		const allVideosMap = new Map<number, any>();
		for (const video of [...hits, ...missedVideos]) allVideosMap.set(video.id, video);
		const allVideos = videoIdRows.map((v) => allVideosMap.get(v.id));

		// 5️⃣ Fetch dynamic fields fresh
		const dynamicData = await db
			.select({
				id: videos.id,
				viewCount: videos.viewCount,
				likeCount: sql`COUNT(DISTINCT ${videoLikes.id})`,
				saveCount: sql`COUNT(DISTINCT ${userSavedVideos.id})`,
				isLike: sql`CASE WHEN ${videoLikes.videoId} IS NOT NULL THEN true ELSE false END`,
				isSave: sql`CASE WHEN ${userSavedVideos.videoId} IS NOT NULL THEN true ELSE false END`,
			})
			.from(videos)
			.leftJoin(videoLikes, and(eq(videoLikes.videoId, videos.id), eq(videoLikes.userId, Number(userId))))
			.leftJoin(
				userSavedVideos,
				and(eq(userSavedVideos.videoId, videos.id), eq(userSavedVideos.userId, Number(userId)))
			)
			.where(
				inArray(
					videos.id,
					videoIdRows.map((v) => v.id)
				)
			)
			.groupBy(videos.id, videoLikes.videoId, userSavedVideos.videoId);

		const videosWithMedia = allVideos.map((v) => {
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

		return res.status(200).json({ videosWithMedia, hasMore: allVideos.length === limit });
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
			.leftJoin(
				userSavedVideos,
				and(eq(userSavedVideos.videoId, videos.id), eq(userSavedVideos.userId, Number(userId)))
			)
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

// export const updateVideo = async (req: AuthenticatedRequest, res: Response) => {
// 	let videoFile: Express.Multer.File | undefined;
// 	let thumbnailFile: Express.Multer.File | undefined;

// 	try {
// 		const { userId } = req.user ?? { userId: "1" };
// 		const { id } = req.params;
// 		const { title, description, type, topic } = req.body;

// 		if (!id || !title || !description || !type || !topic) {
// 			return res.status(400).json({ success: false, message: "Missing required fields" });
// 		}

// 		const [doesUserOwnThisVideo] = await db
// 			.select()
// 			.from(videos)
// 			.where(and(eq(videos.id, Number(id)), eq(videos.userId, Number(userId))))
// 			.limit(1);

// 		if (!doesUserOwnThisVideo) {
// 			return res.status(404).json({ success: false, message: "Video not found" });
// 		}

// 		if (req.files && typeof req.files === "object" && "video" in req.files && "image" in req.files) {
// 			videoFile = (req.files as { [fieldname: string]: Express.Multer.File[] }).video[0];
// 			thumbnailFile = (req.files as { [fieldname: string]: Express.Multer.File[] }).image[0];
// 		}

// 		const uniqueKey =
// 			videoFile && thumbnailFile
// 				? `${videoFile.filename}-${crypto.randomUUID()}-${thumbnailFile.filename}`
// 				: crypto.randomUUID();

// 		let newVideoUrl: string | null = null;
// 		if (videoFile) {
// 			const [videoUrlForDeletionForThisVideo] = await db
// 				.select({ videoUrlForDeletion: videos.videoUrlForDeletion })
// 				.from(videos)
// 				.where(eq(videos.id, Number(id)))
// 				.limit(1);

// 			await deleteFromCloudflare("komplex-video", videoUrlForDeletionForThisVideo.videoUrlForDeletion ?? "");
// 			newVideoUrl = await uploadVideoToCloudflare(
// 				uniqueKey,
// 				await fs.promises.readFile(videoFile.path),
// 				videoFile.mimetype
// 			);
// 		}

// 		let newThumbnailUrl: string | null = null;
// 		if (thumbnailFile) {
// 			const [thumbnailUrlForDeletionForThisVideo] = await db
// 				.select({ thumbnailUrlForDeletion: videos.thumbnailUrlForDeletion })
// 				.from(videos)
// 				.where(eq(videos.id, Number(id)))
// 				.limit(1);

// 			await deleteFromCloudflare(
// 				"komplex-video",
// 				thumbnailUrlForDeletionForThisVideo.thumbnailUrlForDeletion ?? ""
// 			);
// 			newThumbnailUrl = await uploadImageToCloudflare(
// 				uniqueKey,
// 				await fs.promises.readFile(thumbnailFile.path),
// 				thumbnailFile.mimetype
// 			);
// 		}

// 		const updateData: Partial<typeof videos.$inferInsert> = {
// 			title,
// 			description,
// 			type,
// 			topic,
// 			updatedAt: new Date(),
// 		};

// 		if (newVideoUrl) {
// 			updateData.videoUrl = newVideoUrl;
// 			updateData.videoUrlForDeletion = uniqueKey;
// 		}

// 		if (newThumbnailUrl) {
// 			updateData.thumbnailUrl = newThumbnailUrl;
// 			updateData.thumbnailUrlForDeletion = uniqueKey;
// 		}

// 		const [updateVideoResult] = await db
// 			.update(videos)
// 			.set(updateData)
// 			.where(eq(videos.id, Number(id)))
// 			.returning();

// 		// Fetch updated video with media and username
// 		const video = await db
// 			.select({
// 				id: videos.id,
// 				userId: videos.userId,
// 				title: videos.title,
// 				description: videos.description,
// 				type: videos.type,
// 				topic: videos.topic,
// 				duration: videos.duration,
// 				videoUrl: videos.videoUrl,
// 				thumbnailUrl: videos.thumbnailUrl,
// 				createdAt: videos.createdAt,
// 				updatedAt: videos.updatedAt,
// 				username: sql`${users.firstName} || ' ' || ${users.lastName}`,
// 				viewCount: videos.viewCount,
// 			})
// 			.from(videos)
// 			.leftJoin(users, eq(videos.userId, users.id))
// 			.where(eq(videos.id, Number(id)));

// 		const videoWithMedia = {
// 			id: video[0].id,
// 			userId: video[0].userId,
// 			title: video[0].title,
// 			description: video[0].description,
// 			type: video[0].type,
// 			topic: video[0].topic,
// 			duration: video[0].duration,
// 			videoUrl: video[0].videoUrl,
// 			thumbnailUrl: video[0].thumbnailUrl,
// 			createdAt: video[0].createdAt,
// 			updatedAt: video[0].updatedAt,
// 			username: video[0].username,
// 			viewCount: video[0].viewCount,
// 		};

// 		// Update Redis cache
// 		await redis.del(`videos:${id}`);
// 		await redis.set(`videos:${id}`, JSON.stringify(videoWithMedia), { EX: 600 });

// 		return res.status(200).json({ success: true, updateVideo: updateVideoResult });
// 	} catch (error) {
// 		return res.status(500).json({
// 			success: false,
// 			error: (error as Error).message,
// 		});
// 	} finally {
// 		// cleanup temp files
// 		if (videoFile) await fs.promises.unlink(videoFile.path).catch(() => {});
// 		if (thumbnailFile) await fs.promises.unlink(thumbnailFile.path).catch(() => {});
// 	}
// };

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

		// Delete from cloudflare
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

export const getVideoExercise = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const cacheKey = `exercises:videoId:${id}`;
		const cachedResult = await redis.get(cacheKey);
		if (cachedResult) {
			console.log("data from redis");
			return res.status(200).json(JSON.parse(cachedResult));
		}

		const videoExercise = await db
			.select()
			.from(exercises)
			.where(eq(exercises.videoId, Number(id)));
		const exerciseQuestions = await db
			.select()
			.from(questionsTable)
			.where(eq(questionsTable.exerciseId, videoExercise[0].id));
		let exerciseQuestionsWithChoices = [];
		for (const question of exerciseQuestions) {
			const exerciseChoices = await db.select().from(choices).where(eq(choices.questionId, question.id));
			exerciseQuestionsWithChoices.push({
				...question,
				choices: exerciseChoices,
			});
		}
		await redis.set(cacheKey, JSON.stringify(exerciseQuestionsWithChoices));
		return res.status(200).json(exerciseQuestionsWithChoices);
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const updateVideoExercise = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: "1" };
		const cacheKey = `exercises:videoId:${id}`;

		const { questions } = req.body;

		const [exercise] = await db
			.select()
			.from(exercises)
			.where(eq(exercises.videoId, Number(id)));

		if (!exercise) {
			return res.status(404).json({ success: false, message: "Exercise not found" });
		}

		await db
			.update(exercises)
			.set({
				title: exercise.title,
				description: exercise.description,
				subject: exercise.subject,
				grade: exercise.grade,
				duration: exercise.duration,
				updatedAt: new Date(),
			})
			.where(eq(exercises.id, exercise.id));

		for (const question of questions) {
			const [existingQuestion] = await db
				.select()
				.from(questionsTable)
				.where(eq(questionsTable.exerciseId, exercise.id));

			if (!existingQuestion) {
				await db.insert(questionsTable).values({
					exerciseId: exercise.id,
					title: question.title,
					questionType: "",
					section: "",
					imageUrl: "",
					createdAt: new Date(),
					updatedAt: new Date(),
				});
			}

			for (const choice of question.choices) {
				// Check if choice has an ID (existing choice) or not (new choice)
				if (choice.id && !isNaN(Number(choice.id))) {
					// Update existing choice
					const [existingChoice] = await db
						.select()
						.from(choices)
						.where(eq(choices.id, Number(choice.id)));

					if (existingChoice) {
						await db
							.update(choices)
							.set({
								text: choice.text,
								isCorrect: choice.isCorrect,
								updatedAt: new Date(),
							})
							.where(eq(choices.id, Number(choice.id)));
					}
				} else {
					// Insert new choice
					await db.insert(choices).values({
						questionId: existingQuestion.id,
						text: choice.text,
						isCorrect: choice.isCorrect,
						createdAt: new Date(),
						updatedAt: new Date(),
					});
				}
			}
		}
		const videoExercise = await db
			.select()
			.from(exercises)
			.where(eq(exercises.videoId, Number(id)));
		const exerciseQuestions = await db
			.select()
			.from(questionsTable)
			.where(eq(questionsTable.exerciseId, videoExercise[0].id));
		let exerciseQuestionsWithChoices = [];
		for (const question of exerciseQuestions) {
			const exerciseChoices = await db.select().from(choices).where(eq(choices.questionId, question.id));
			exerciseQuestionsWithChoices.push({
				...question,
				choices: exerciseChoices,
			});
		}
		await redis.set(cacheKey, JSON.stringify(exerciseQuestionsWithChoices));
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const updateVideoPresignedUrl = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: "1" };
		//   // Update video data
		//   await axios.put(`http://localhost:6969/videos/${video.id}`, {
		// 	title: formData.title,
		// 	description: formData.description,
		// 	videoKey: videoKey,
		// 	thumbnailKey: thumbnailKey,
		// });

		const { title, description, videoKey, thumbnailKey } = req.body;

		const videoUrl = `${process.env.R2_VIDEO_PUBLIC_URL}/${videoKey}`;
		const thumbnailUrl = `${process.env.R2_PHOTO_PUBLIC_URL}/${thumbnailKey}`;

		const [video] = await db
			.select()
			.from(videos)
			.where(eq(videos.id, Number(id)))
			.limit(1);

		if (!video) {
			return res.status(404).json({ success: false, message: "Video not found" });
		}

		// delete video from cloudflare
		try {
			await deleteFromCloudflare("komplex-video", video.videoUrlForDeletion ?? "");
		} catch (err) {
			console.error("Failed to delete video from Cloudflare:", err);
		}

		try {
			await deleteFromCloudflare("komplex-image", video.thumbnailUrlForDeletion ?? "");
		} catch (err) {
			console.error("Failed to delete thumbnail from Cloudflare:", err);
		}

		await db
			.update(videos)
			.set({
				title,
				description,
				videoUrl: videoUrl,
				thumbnailUrl: thumbnailUrl,
				videoUrlForDeletion: videoKey,
				thumbnailUrlForDeletion: thumbnailKey,
				updatedAt: new Date(),
			})
			.where(eq(videos.id, Number(id)));

		const newVideo = await db
			.select()
			.from(videos)
			.where(eq(videos.id, Number(id)))
			.limit(1);
		const cacheKey = `videos:${newVideo[0].id}`;
		await redis.set(cacheKey, JSON.stringify(newVideo[0]), { EX: 600 });

		return res.status(200).json({ success: true, video: newVideo[0] });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};
