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
import { redis } from "@/db/redis/redisConfig.js";

export const getAllMyVideos = async (query: any, userId: number) => {
  const { topic, type, page } = query;
  const conditions = [];
  const limit = 20;
  const offset = ((Number(page) || 1) - 1) * limit;
  if (topic) conditions.push(eq(videos.topic, topic as string));
  if (type) conditions.push(eq(videos.type, type as string));
  const cacheKey = `myVideos:${userId}:type:${type || "all"}:topic:${
    topic || "all"
  }:page:${page || 1}`;
  const cached = await redis.get(cacheKey);
  const parsedData = cached ? JSON.parse(cached) : null;
  if (parsedData) {
    return parsedData;
  }

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
    )
    .limit(limit)
    .offset(offset)
    .orderBy(
      sql`CASE WHEN DATE(${videos.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END DESC`,
      desc(videos.updatedAt)
    );
  await redis.set(
    cacheKey,
    JSON.stringify({ data: videoRows, hasMore: videoRows.length === limit }),
    {
      EX: 60 * 60 * 24,
    }
  );

  return { data: videoRows, hasMore: videoRows.length === limit };
};

export interface VideoHistory {
  id: number;
  videoId: number;
  createdAt: string;
  updatedAt: string;
  title: string;
  thumbnailUrl: string;
}

export const getMyVideoHistory = async (userId: number) => {
  const cacheKey = `myVideoHistory:${userId}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return { data: JSON.parse(cached) as VideoHistory[] };
  }

  const videoHistory = await db
    .select({
      id: userVideoHistory.id,
      videoId: userVideoHistory.videoId,
      createdAt: userVideoHistory.createdAt,
      updatedAt: userVideoHistory.updatedAt,
      title: videos.title,
      thumbnailUrl: videos.thumbnailUrl,
    })
    .from(userVideoHistory)
    .leftJoin(videos, eq(userVideoHistory.videoId, videos.id))
    .where(eq(userVideoHistory.userId, Number(userId)))
    .orderBy(desc(userVideoHistory.createdAt));

  const formattedHistory: VideoHistory[] = videoHistory.map((history) => ({
    id: history.id,
    videoId: history.videoId || 0,
    createdAt: history.createdAt?.toISOString() || "",
    updatedAt: history.updatedAt?.toISOString() || "",
    title: history.title || "",
    thumbnailUrl: history.thumbnailUrl || "",
  }));

  await redis.set(cacheKey, JSON.stringify(formattedHistory), { EX: 600 });

  return { data: formattedHistory };
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

    let questionsForExercise: {
      title: string | null;
      questionType: string | null;
      section: string | null;
      imageUrl: string | null;
      choices: { text: string; isCorrect: boolean }[];
    }[] = [];

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

      let choicesForQuestion: { text: string; isCorrect: boolean }[] = [];
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
    const cacheKey = `exercises:videoId:${newVideo[0].id}`;
    await redis.set(cacheKey, JSON.stringify(exercise), { EX: 600 });
  }
  await redis.del(`dashboardData:${userId}`);
  const myVideoKeys: string[] = await redis.keys(
    `myVideos:${userId}:type:*:topic:*:page:*`
  );

  if (myVideoKeys.length > 0) {
    await redis.del(myVideoKeys);
  }

  return { data: newVideo };
};
