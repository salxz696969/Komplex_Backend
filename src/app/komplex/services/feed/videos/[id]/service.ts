import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/index.js";
import {
	videos,
	users,
	userSavedVideos,
	videoLikes,
	userVideoHistory,
	exercises,
	questions,
	choices,
} from "@/db/schema.js";
import { redis } from "@/db/redis/redisConfig.js";

export const getVideoById = async (videoId: number, userId: number) => {
	if (!videoId) {
		throw new Error("Missing video id");
	}
	const cacheVideoKey = `video:${videoId}`;
	const cacheExercisesKey = `exercises:videoId:${videoId}`;

	const cacheVideoData = await redis.get(cacheVideoKey);
	const cacheExercisesData = await redis.get(cacheExercisesKey);
	if (cacheVideoData && cacheExercisesData) {
		const video = JSON.parse(cacheVideoData);
		const exercises = JSON.parse(cacheExercisesData);
		return { data: { ...video, exercises } };
	}

	const [videoRow] = await db
		.select({
			id: videos.id,
			userId: videos.userId,
			title: videos.title,
			description: videos.description,
			duration: videos.duration,
			videoUrl: videos.videoUrl,
			thumbnailUrl: videos.thumbnailUrl,
			videoUrlForDeletion: videos.videoUrlForDeletion,
			thumbnailUrlForDeletion: videos.thumbnailUrlForDeletion,
			viewCount: videos.viewCount,
			createdAt: videos.createdAt,
			updatedAt: videos.updatedAt,
			username: sql`${users.firstName} || ' ' || ${users.lastName}`,
			profileImage: users.profileImage,
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
	await redis.set(cacheVideoKey, JSON.stringify(videoRow), { EX: 600 });

	if (!videoRow) {
		throw new Error("Video not found");
	}

	// get video exercises
	const videoExercisesRows = await db
		.select()
		.from(exercises)
		.where(eq(exercises.videoId, videoId))
		.leftJoin(questions, eq(exercises.id, questions.exerciseId))
		.leftJoin(choices, eq(questions.id, choices.questionId))
		.groupBy(exercises.id, questions.id, choices.id);

	const videoExerciseMap = new Map();

	for (const row of videoExercisesRows) {
		const exercise = row.exercises;
		if (!videoExerciseMap.has(exercise.id)) {
			videoExerciseMap.set(exercise.id, {
				...exercise,
				questions: [],
			});
		}
		const exerciseObj = videoExerciseMap.get(exercise.id);

		if (row.questions?.id) {
			let question = exerciseObj.questions.find((q: any) => q.id === row.questions?.id);
			if (!question) {
				question = { ...row.questions, choices: [] };
				exerciseObj.questions.push(question);
			}

			if (row.choices?.id) {
				question.choices.push(row.choices);
			}
		}
	}

	const videoExercises = Array.from(videoExerciseMap.values());

	// increment view count
	await db
		.update(videos)
		.set({
			viewCount: (videoRow.viewCount ?? 0) + 1,
		})
		.where(eq(videos.id, videoId));

	// insert into history
	await db.insert(userVideoHistory).values({
		userId: Number(userId),
		videoId: videoId,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
	await redis.set(cacheExercisesKey, JSON.stringify(videoExercises), { EX: 600 });

	const videoWithExercises = { ...videoRow, exercises: videoExercises };

	return { data: videoWithExercises };
};
