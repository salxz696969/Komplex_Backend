import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/index.js";
import {
	videoLikes,
	userSavedVideos,
	videos,
	videoComments,
	exercises,
	questions,
	choices,
	userVideoHistory,
	users,
} from "@/db/schema.js";
import { deleteFromCloudflare } from "@/db/cloudflare/cloudflareFunction.js";
import { deleteVideoCommentInternal } from "@/app/komplex/services/me/video-comments/[id]/service.js";
import { redis } from "@/db/redis/redisConfig.js";
import { meilisearch } from "@/meilisearch/meilisearchConfig.js";

export const likeVideo = async (videoId: number, userId: number) => {
	if (!userId) {
		throw new Error("Unauthorized");
	}

	const like = await db
		.insert(videoLikes)
		.values({
			userId: Number(userId),
			videoId: Number(videoId),
			createdAt: new Date(),
			updatedAt: new Date(),
		})
		.returning();

	return { data: { like } };
};

export const unlikeVideo = async (videoId: number, userId: number) => {
	if (!userId) {
		throw new Error("Unauthorized");
	}

	const unlike = await db
		.delete(videoLikes)
		.where(and(eq(videoLikes.userId, Number(userId)), eq(videoLikes.videoId, Number(videoId))))
		.returning();

	return { data: { unlike } };
};

export const saveVideo = async (videoId: number, userId: number) => {
	if (!userId) {
		throw new Error("Unauthorized");
	}

	const videoToSave = await db.insert(userSavedVideos).values({
		userId: Number(userId),
		videoId: Number(videoId),
		createdAt: new Date(),
		updatedAt: new Date(),
	});

	return {
		data: {
			success: true,
			message: "Video saved successfully",
			video: videoToSave,
		},
	};
};

export const unsaveVideo = async (videoId: number, userId: number) => {
	if (!userId) {
		throw new Error("Unauthorized");
	}

	const videoToUnsave = await db
		.delete(userSavedVideos)
		.where(and(eq(userSavedVideos.userId, Number(userId)), eq(userSavedVideos.videoId, Number(videoId))))
		.returning();

	if (!videoToUnsave || videoToUnsave.length === 0) {
		throw new Error("Video not found");
	}

	return {
		data: {
			success: true,
			message: "Video unsaved successfully",
			video: videoToUnsave,
		},
	};
};

type UpdateVideoPayload = {
	title: string;
	description: string;
	videoKey?: string;
	thumbnailKey?: string;
	questions?: Array<{
		id?: number | string;
		title: string;
		choices: Array<{ id?: number | string; text: string; isCorrect: boolean }>;
	}>;
};

export const updateVideo = async (id: number, userId: number, payload: UpdateVideoPayload) => {
	let gotToStep = [];
	const { title, description, videoKey, thumbnailKey, questions: questionsPayload } = payload;

	const [video] = await db
		.select()
		.from(videos)
		.where(and(eq(videos.id, Number(id)), eq(videos.userId, Number(userId))))
		.limit(1);

	gotToStep.push("getting video ");

	if (!video) {
		throw new Error("Video not found");
	}

	const updateData: Partial<typeof videos.$inferInsert> = {
		title,
		description,
		updatedAt: new Date(),
	};

	if (videoKey) {
		gotToStep.push("deleting old video ");
		try {
			if (video.videoUrlForDeletion) {
				await deleteFromCloudflare("komplex-video", video.videoUrlForDeletion);
			}
		} catch {}
		updateData.videoUrl = `${process.env.R2_VIDEO_PUBLIC_URL}/${videoKey}`;
		updateData.videoUrlForDeletion = videoKey;
	}

	if (thumbnailKey) {
		gotToStep.push("deleting old thumbnail ");
		try {
			if (video.thumbnailUrlForDeletion) {
				await deleteFromCloudflare("komplex-image", video.thumbnailUrlForDeletion);
			}
		} catch {}
		updateData.thumbnailUrl = `${process.env.R2_PHOTO_PUBLIC_URL}/${thumbnailKey}`;
		updateData.thumbnailUrlForDeletion = thumbnailKey;
	}

	const updatedVideo = await db
		.update(videos)
		.set(updateData)
		.where(eq(videos.id, Number(id)))
		.returning({ id: videos.id });

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
		.where(eq(videos.id, updatedVideo[0].id))
		.groupBy(
			videos.id,
			users.firstName,
			users.lastName,
			userSavedVideos.videoId,
			videoLikes.videoId,
			userSavedVideos.id,
			videoLikes.id
		);
	const cacheVideoKey = `video:${videoRow.id}`;
	await redis.set(cacheVideoKey, JSON.stringify(videoRow), { EX: 600 });
  const meilisearchData={
    id: videoRow.id,
    title: videoRow.title,
    description: videoRow.description,
  };
  await meilisearch.index("videos").addDocuments([meilisearchData]);

	// If questions are provided, update exercise/questions/choices
	if (Array.isArray(questionsPayload) && questionsPayload.length > 0) {
		gotToStep.push("getting exercise ");
		const [exercise] = await db
			.select()
			.from(exercises)
			.where(eq(exercises.videoId, Number(id)))
			.limit(1);

		// Ensure exercise exists; create if missing
		const exerciseIdToUse = async () => {
			if (exercise) {
				gotToStep.push("updating exercise ");
				await db.update(exercises).set({ updatedAt: new Date() }).where(eq(exercises.id, exercise.id));
				return exercise.id;
			}
			gotToStep.push("creating exercise ");
			const [createdExercise] = await db
				.insert(exercises)
				.values({
					videoId: Number(id),
					userId: Number(userId),
					duration: 0,
					title: title ?? null,
					description: description ?? null,
					subject: null,
					grade: null as any,
					createdAt: new Date(),
					updatedAt: new Date(),
				})
				.returning();
			return createdExercise.id;
		};

		const ensuredExerciseId = await exerciseIdToUse();

		for (const question of questionsPayload) {
			let questionIdToUse: number | null = null;

			if (question.id && !isNaN(Number(question.id))) {
				const [existingQuestionById] = await db
					.select()
					.from(questions)
					.where(eq(questions.id, Number(question.id)))
					.limit(1);

				if (existingQuestionById) {
					gotToStep.push("updating question because it already exists ");
					questionIdToUse = existingQuestionById.id;
					await db
						.update(questions)
						.set({ title: question.title, updatedAt: new Date() })
						.where(eq(questions.id, existingQuestionById.id));
				}
			}

			if (!questionIdToUse) {
				gotToStep.push("inserting question ");
				const [insertedQuestion] = await db
					.insert(questions)
					.values({
						exerciseId: ensuredExerciseId,
						title: question.title,
						createdAt: new Date(),
						updatedAt: new Date(),
					})
					.returning();
				questionIdToUse = insertedQuestion.id;
			}

			for (const choice of question.choices) {
				if (choice.id && !isNaN(Number(choice.id))) {
					const [existingChoice] = await db
						.select()
						.from(choices)
						.where(eq(choices.id, Number(choice.id)))
						.limit(1);
					if (existingChoice) {
						gotToStep.push("updating choice because it already exists ");
						await db
							.update(choices)
							.set({
								text: choice.text,
								isCorrect: choice.isCorrect,
								updatedAt: new Date(),
							})
							.where(eq(choices.id, existingChoice.id));
						continue;
					}
				}
				gotToStep.push("inserting choice ");
				await db.insert(choices).values({
					questionId: Number(questionIdToUse),
					text: choice.text,
					isCorrect: choice.isCorrect,
					createdAt: new Date(),
					updatedAt: new Date(),
				});
			}

			// Fetch updated exercises/questions/choices and cache in Redis
			const videoExercisesRows = await db
				.select()
				.from(exercises)
				.where(eq(exercises.videoId, Number(id)))
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
			const cacheExercisesKey = `video:exercises:${id}`;
			await redis.set(cacheExercisesKey, JSON.stringify(videoExercises), {
				EX: 600,
			});
		}
	}
	await redis.del(`dashboardData:${userId}`);
	const myVideoKeys: string[] = await redis.keys(`myVideos:${userId}:type:*:topic:*`);
	if (myVideoKeys.length > 0) {
		await redis.del(myVideoKeys);
	}

	return { data: { success: true, gotToStep } };
};

export const deleteVideo = async (id: number, userId: number) => {
	let gotToStep = [];

	// Check ownership
	gotToStep.push("checking ownership ");
	const [doesThisUserOwnThisVideo] = await db
		.select({
			videoUrlForDeletion: videos.videoUrlForDeletion,
			thumbnailUrlForDeletion: videos.thumbnailUrlForDeletion,
		})
		.from(videos)
		.where(and(eq(videos.id, Number(id)), eq(videos.userId, Number(userId))));

	gotToStep.push("checking ownership ");

	if (!doesThisUserOwnThisVideo) {
		throw new Error("Video not found or unauthorized");
	}

	gotToStep.push("checking if video has comments ");

	const [doesThisVideoHasComments] = await db
		.select()
		.from(videoComments)
		.where(eq(videoComments.videoId, Number(id)))
		.limit(1);

	gotToStep.push("checking if video has comments ");

	let deleteComments = null;
	console.log("ABOUT TO CHECK IF VIDEO HAS COMMENTS");
	if (doesThisVideoHasComments) {
		console.log("VIDEO HAS COMMENTS");
		// If the video has comments, we need to delete them as well
		gotToStep.push("deleting comments ");
		deleteComments = await deleteVideoCommentInternal(Number(userId), null, Number(id));
	}

	// Delete likes
	gotToStep.push("deleting likes ");
	const deletedLikes = await db
		.delete(videoLikes)
		.where(eq(videoLikes.videoId, Number(id)))
		.returning();

	// Delete saves
	gotToStep.push("deleting saves ");
	const deletedSaves = await db
		.delete(userSavedVideos)
		.where(eq(userSavedVideos.videoId, Number(id)))
		.returning();

	// get exercies for this video
	gotToStep.push("getting exercise ");
	const exerciseId = await db
		.select()
		.from(exercises)
		.where(eq(exercises.videoId, Number(id)));
	if (exerciseId && exerciseId.length > 0) {
		// get quesitons for this video
		gotToStep.push("getting questions ");
		const questionIds = await db
			.select()
			.from(questions)
			.where(eq(questions.exerciseId, Number(exerciseId[0].id)));

		// delete choices for this video
		gotToStep.push("deleting choices ");
		for (const questionId of questionIds) {
			// delete choices for this question
			await db
				.delete(choices)
				.where(eq(choices.questionId, Number(questionId.id)))
				.returning();
		}

		// delete questions for this video
		gotToStep.push("deleting questions ");
		await db
			.delete(questions)
			.where(eq(questions.exerciseId, Number(exerciseId[0].id)))
			.returning();

		// delete exercise for this video
		gotToStep.push("deleting exercise ");
		const deletedExercise = await db
			.delete(exercises)
			.where(eq(exercises.videoId, Number(id)))
			.returning();
	}

	// Delete from Cloudflare
	if (doesThisUserOwnThisVideo.videoUrlForDeletion) {
		gotToStep.push("deleting video from Cloudflare ");
		try {
			await deleteFromCloudflare("komplex-video", doesThisUserOwnThisVideo.videoUrlForDeletion);
		} catch (err) {
			console.error("Failed to delete video from Cloudflare:", err);
		}
	}

	if (doesThisUserOwnThisVideo.thumbnailUrlForDeletion) {
		gotToStep.push("deleting thumbnail from Cloudflare ");
		try {
			await deleteFromCloudflare("komplex-image", doesThisUserOwnThisVideo.thumbnailUrlForDeletion);
		} catch (err) {
			console.error("Failed to delete thumbnail from Cloudflare:", err);
		}
	}

	gotToStep.push("deleting user video history ");
	await db.delete(userVideoHistory).where(eq(userVideoHistory.videoId, Number(id)));

	// Delete video record
	gotToStep.push("deleting video record ");
	const deletedVideo = await db
		.delete(videos)
		.where(and(eq(videos.id, Number(id)), eq(videos.userId, Number(userId))))
		.returning();
	await redis.del(`videos:${id}`);
	const myVideoKeys: string[] = await redis.keys(`myVideos:${userId}:type:*:topic:*`);

	if (myVideoKeys.length > 0) {
		await redis.del(myVideoKeys);
	}
	await redis.del(`dashboardData:${userId}`);

  await meilisearch.index("videos").deleteDocument(String(id)); // ✅ expects a string ID

	return { data: deletedVideo, gotToStep };
};

// Note: exercise update is now embedded in updateVideo when payload.questions is provided.
