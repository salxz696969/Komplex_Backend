import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/index.js";
import {
  users,
  userSavedVideos,
  videoLikes,
  videos,
  userVideoHistory,
  questions as questionsTable,
  exercises,
  choices,
} from "@/db/schema.js";

export const getAllMyVideos = async (query: any, userId: number) => {
  const { topic, type } = query;
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
      and(
        eq(userSavedVideos.videoId, videos.id),
        eq(userSavedVideos.userId, Number(userId))
      )
    )
    .leftJoin(
      videoLikes,
      and(
        eq(videoLikes.videoId, videos.id),
        eq(videoLikes.userId, Number(userId))
      )
    )
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

  return { data: videoRows };
};

export const getMyVideoHistory = async (userId: number) => {
  const videoHistory = await db
    .select()
    .from(userVideoHistory)
    .leftJoin(videos, eq(userVideoHistory.videoId, videos.id))
    .where(eq(userVideoHistory.userId, Number(userId)))
    .orderBy(desc(userVideoHistory.createdAt));

  return {
    data: videoHistory.map((history) => ({
      id: history.user_video_history.id,
      videoId: history.user_video_history.videoId,
      createdAt: history.user_video_history.createdAt,
      updatedAt: history.user_video_history.updatedAt,
      title: history.videos?.title,
      thumbnailUrl: history.videos?.thumbnailUrl,
    })),
  };
};

export const postVideo = async (body: any, userId: number) => {
  const {
    videoKey,
    title,
    description,
    topic,
    type,
    thumbnailKey,
    duration,
    questions,
  } = body;

  // Validate that the user exists
  const userExists = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, Number(userId)))
    .limit(1);

  if (userExists.length === 0) {
    throw new Error(`User with ID ${userId} does not exist`);
  }

  const videoUrl = `${process.env.R2_VIDEO_PUBLIC_URL}/${videoKey}`;
  const thumbnailUrl = `${process.env.R2_PHOTO_PUBLIC_URL}/${thumbnailKey}`;

  const newVideo = await db
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
      duration: duration || 0,
      userId: Number(userId),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  // Create exercise for video quiz
  console.log(questions);

  if (questions && questions.length > 0) {
    const newExercise = await db
      .insert(exercises)
      .values({
        videoId: newVideo[0].id,
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

    for (const question of questions) {
      const newQuestion = await db
        .insert(questionsTable)
        .values({
          exerciseId: newExercise[0].id,
          title: question.title,
          questionType: "",
          section: "",
          imageUrl: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      for (const choice of question.choices) {
        await db.insert(choices).values({
          questionId: newQuestion[0].id,
          text: choice.text,
          isCorrect: choice.isCorrect,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  }

  return { data: newVideo };
};
