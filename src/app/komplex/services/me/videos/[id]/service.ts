import { and, eq } from "drizzle-orm";
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
} from "@/db/schema.js";
import {
  uploadVideoToCloudflare,
  uploadImageToCloudflare,
  deleteFromCloudflare,
} from "@/db/cloudflare/cloudflareFunction.js";
import { deleteVideoCommentInternal } from "@/app/komplex/services/me/video-comments/[id]/service.js";
import fs from "fs";

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
    .where(
      and(
        eq(videoLikes.userId, Number(userId)),
        eq(videoLikes.videoId, Number(videoId))
      )
    )
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
    .where(
      and(
        eq(userSavedVideos.userId, Number(userId)),
        eq(userSavedVideos.videoId, Number(videoId))
      )
    )
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

export const updateVideo = async (
  id: number,
  userId: number,
  payload: UpdateVideoPayload
) => {
  const {
    title,
    description,
    videoKey,
    thumbnailKey,
    questions: questionsPayload,
  } = payload;

  const [video] = await db
    .select()
    .from(videos)
    .where(and(eq(videos.id, Number(id)), eq(videos.userId, Number(userId))))
    .limit(1);

  if (!video) {
    throw new Error("Video not found");
  }

  const updateData: Partial<typeof videos.$inferInsert> = {
    title,
    description,
    updatedAt: new Date(),
  };

  if (videoKey) {
    try {
      if (video.videoUrlForDeletion) {
        await deleteFromCloudflare("komplex-video", video.videoUrlForDeletion);
      }
    } catch {}
    updateData.videoUrl = `${process.env.R2_VIDEO_PUBLIC_URL}/${videoKey}`;
    updateData.videoUrlForDeletion = videoKey;
  }

  if (thumbnailKey) {
    try {
      if (video.thumbnailUrlForDeletion) {
        await deleteFromCloudflare(
          "komplex-image",
          video.thumbnailUrlForDeletion
        );
      }
    } catch {}
    updateData.thumbnailUrl = `${process.env.R2_PHOTO_PUBLIC_URL}/${thumbnailKey}`;
    updateData.thumbnailUrlForDeletion = thumbnailKey;
  }

  await db
    .update(videos)
    .set(updateData)
    .where(eq(videos.id, Number(id)));

  // If questions are provided, update exercise/questions/choices
  if (Array.isArray(questionsPayload) && questionsPayload.length > 0) {
    const [exercise] = await db
      .select()
      .from(exercises)
      .where(eq(exercises.videoId, Number(id)))
      .limit(1);

    if (exercise) {
      await db
        .update(exercises)
        .set({ updatedAt: new Date() })
        .where(eq(exercises.id, exercise.id));

      for (const question of questionsPayload) {
        let questionIdToUse: number | null = null;

        if (question.id && !isNaN(Number(question.id))) {
          const [existingQuestionById] = await db
            .select()
            .from(questions)
            .where(eq(questions.id, Number(question.id)))
            .limit(1);

          if (existingQuestionById) {
            questionIdToUse = existingQuestionById.id;
            await db
              .update(questions)
              .set({ title: question.title, updatedAt: new Date() })
              .where(eq(questions.id, existingQuestionById.id));
          }
        }

        if (!questionIdToUse) {
          const [insertedQuestion] = await db
            .insert(questions)
            .values({
              exerciseId: exercise.id,
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
          await db.insert(choices).values({
            questionId: Number(questionIdToUse),
            text: choice.text,
            isCorrect: choice.isCorrect,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }
  }

  return { data: { success: true } };
};

export const deleteVideo = async (id: number, userId: number) => {
  // Check ownership
  const [doesThisUserOwnThisVideo] = await db
    .select({
      videoUrlForDeletion: videos.videoUrlForDeletion,
      thumbnailUrlForDeletion: videos.thumbnailUrlForDeletion,
    })
    .from(videos)
    .where(and(eq(videos.id, Number(id)), eq(videos.userId, Number(userId))));

  if (!doesThisUserOwnThisVideo) {
    throw new Error("Video not found or unauthorized");
  }

  const [doesThisVideoHasComments] = await db
    .select()
    .from(videoComments)
    .where(eq(videoComments.videoId, Number(id)))
    .limit(1);

  let deleteComments = null;
  if (doesThisVideoHasComments) {
    // If the video has comments, we need to delete them as well
    deleteComments = await deleteVideoCommentInternal(
      Number(userId),
      null,
      Number(id)
    );
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

  // get exercies for this video
  const exerciseId = await db
    .select()
    .from(exercises)
    .where(eq(exercises.videoId, Number(id)));
  if (exerciseId && exerciseId.length > 0) {
    // get quesitons for this video
    const questionIds = await db
      .select()
      .from(questions)
      .where(eq(questions.exerciseId, Number(exerciseId[0].id)));

    // delete choices for this video
    for (const questionId of questionIds) {
      // delete choices for this question
      await db
        .delete(choices)
        .where(eq(choices.questionId, Number(questionId.id)))
        .returning();
    }

    // delete questions for this video
    await db
      .delete(questions)
      .where(eq(questions.exerciseId, Number(exerciseId[0].id)))
      .returning();

    // delete exercise for this video
    const deletedExercise = await db
      .delete(exercises)
      .where(eq(exercises.videoId, Number(id)))
      .returning();
  }

  // Delete from Cloudflare
  if (doesThisUserOwnThisVideo.videoUrlForDeletion) {
    try {
      await deleteFromCloudflare(
        "komplex-video",
        doesThisUserOwnThisVideo.videoUrlForDeletion
      );
    } catch (err) {
      console.error("Failed to delete video from Cloudflare:", err);
    }
  }

  if (doesThisUserOwnThisVideo.thumbnailUrlForDeletion) {
    try {
      await deleteFromCloudflare(
        "komplex-image",
        doesThisUserOwnThisVideo.thumbnailUrlForDeletion
      );
    } catch (err) {
      console.error("Failed to delete thumbnail from Cloudflare:", err);
    }
  }

  await db
    .delete(userVideoHistory)
    .where(eq(userVideoHistory.videoId, Number(id)));

  // Delete video record
  const deletedVideo = await db
    .delete(videos)
    .where(and(eq(videos.id, Number(id)), eq(videos.userId, Number(userId))))
    .returning();

  return { data: deletedVideo };
};

// Note: exercise update is now embedded in updateVideo when payload.questions is provided.
