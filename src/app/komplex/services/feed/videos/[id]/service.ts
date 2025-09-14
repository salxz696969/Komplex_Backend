import { and, eq, inArray, sql } from "drizzle-orm";
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
  followers,
} from "@/db/schema.js";
import { redis } from "@/db/redis/redisConfig.js";
import { meilisearch } from "@/config/meilisearchConfig.js";

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
    const isFollowing = await db
      .select()
      .from(followers)
      .where(
        and(
          eq(followers.followedId, Number(video.userId)),
          eq(followers.userId, userId)
        )
      );
    return {
      data: { ...video, exercises, isFollowing: isFollowing.length > 0 },
    };
  }

  const [videoRow] = await db
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
      videoUrlForDeletion: videos.videoUrlForDeletion,
      thumbnailUrlForDeletion: videos.thumbnailUrlForDeletion,
      viewCount: videos.viewCount,
      createdAt: videos.createdAt,
      updatedAt: videos.updatedAt,
      username: sql`${users.firstName} || ' ' || ${users.lastName}`,
      profileImage: users.profileImage,
      isSaved: sql`CASE WHEN ${userSavedVideos.videoId} IS NOT NULL THEN true ELSE false END`,
      isLiked: sql`CASE WHEN ${videoLikes.videoId} IS NOT NULL THEN true ELSE false END`,
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
    .where(eq(videos.id, videoId))
    .groupBy(
      videos.id,
      videos.userId,
      videos.title,
      videos.description,
      videos.duration,
      videos.videoUrl,
      videos.thumbnailUrl,
      videos.videoUrlForDeletion,
      videos.thumbnailUrlForDeletion,
      videos.viewCount,
      videos.createdAt,
      videos.updatedAt,
      sql`${users.firstName} || ' ' || ${users.lastName}`,
      users.profileImage,
      sql`CASE WHEN ${userSavedVideos.videoId} IS NOT NULL THEN true ELSE false END`,
      sql`CASE WHEN ${videoLikes.videoId} IS NOT NULL THEN true ELSE false END`
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
      let question = exerciseObj.questions.find(
        (q: any) => q.id === row.questions?.id
      );
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

  // Always increment view count on every request
  await db
    .update(videos)
    .set({
      viewCount: sql`${videos.viewCount} + 1`,
    })
    .where(eq(videos.id, videoId));

  // insert into history
  await db.insert(userVideoHistory).values({
    userId: Number(userId),
    videoId: videoId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await redis.set(cacheExercisesKey, JSON.stringify(videoExercises), {
    EX: 600,
  });
  const isFollowing = await db
    .select()
    .from(followers)
    .where(
      and(
        eq(followers.followedId, Number(videoRow.userId)),
        eq(followers.userId, userId)
      )
    );

  const videoWithExercises = {
    ...videoRow,
    exercises: videoExercises,
    isFollowing: isFollowing.length > 0,
    viewCount: Number(videoRow.viewCount), // Convert to number
    likeCount: Number(videoRow.likeCount), // Convert to number
    saveCount: Number(videoRow.saveCount), // Convert to number
  };

  return { data: videoWithExercises };
};

export const getRecommendedVideos = async (
  userId: number,
  videoId: number,
  limit: number,
  offset: number
) => {
  let query = "";
  const cacheVideoKey = `video:${videoId}`;
  const cacheVideoData = await redis.get(cacheVideoKey);
  if (cacheVideoData) {
    const video = JSON.parse(cacheVideoData);
    query = `${video.title} ${video.description} ${video.topic} ${video.type}`;
  } else {
    const [videoRow] = await db
      .select({
        id: videos.id,
        userId: videos.userId,
        title: videos.title,
        topic: videos.topic,
        type: videos.type,
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
        isSaved: sql`CASE WHEN ${userSavedVideos.videoId} IS NOT NULL THEN true ELSE false END`,
        isLiked: sql`CASE WHEN ${videoLikes.videoId} IS NOT NULL THEN true ELSE false END`,
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
      .where(eq(videos.id, videoId))
      .groupBy(
        videos.id,
        videos.userId,
        videos.title,
        videos.description,
        videos.duration,
        videos.videoUrl,
        videos.thumbnailUrl,
        videos.videoUrlForDeletion,
        videos.thumbnailUrlForDeletion,
        videos.viewCount,
        videos.createdAt,
        videos.updatedAt,
        sql`${users.firstName} || ' ' || ${users.lastName}`,
        users.profileImage,
        sql`CASE WHEN ${userSavedVideos.videoId} IS NOT NULL THEN true ELSE false END`,
        sql`CASE WHEN ${videoLikes.videoId} IS NOT NULL THEN true ELSE false END`
      );

    await redis.set(cacheVideoKey, JSON.stringify(videoRow), { EX: 600 });
    query = videoRow
      ? `${videoRow.title} ${videoRow.description} ${videoRow.topic} ${videoRow.type}`
      : "";
  }

  const searchResults = await meilisearch.index("videos").search(query, {
    limit: limit ? limit : 10,
    offset: offset ? offset : 0,
  });
  const videoIdRows = searchResults.hits.map((hit: any) => hit.id);
  const cachedResults = (await redis.mGet(
    videoIdRows.map((v) => `videos:${v.id}`)
  )) as (string | null)[];
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
        profileImage: users.profileImage,
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
        profileImage: video.profileImage,
        viewCount: video.viewCount,
      };
      missedVideos.push(formatted);
      await redis.set(`videos:${video.id}`, JSON.stringify(formatted), {
        EX: 600,
      });
    }
  }

  // 4️⃣ Merge hits and missed videos, preserving original order
  const allVideosMap = new Map<number, any>();
  for (const video of [...hits, ...missedVideos])
    allVideosMap.set(video.id, video);
  const allVideos = videoIdRows.map((v) => allVideosMap.get(v.id));

  // 5️⃣ Fetch dynamic fields fresh
  const dynamicData = await db
    .select({
      id: videos.id,
      viewCount: videos.viewCount,
      likeCount: sql`COUNT(DISTINCT ${videoLikes.id})`,
      saveCount: sql`COUNT(DISTINCT ${userSavedVideos.id})`,
      isLiked: sql`CASE WHEN ${videoLikes.videoId} IS NOT NULL THEN true ELSE false END`,
      isSaved: sql`CASE WHEN ${userSavedVideos.videoId} IS NOT NULL THEN true ELSE false END`,
    })
    .from(videos)
    .leftJoin(
      videoLikes,
      and(
        eq(videoLikes.videoId, videos.id),
        eq(videoLikes.userId, Number(userId))
      )
    )
    .leftJoin(
      userSavedVideos,
      and(
        eq(userSavedVideos.videoId, videos.id),
        eq(userSavedVideos.userId, Number(userId))
      )
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
      viewCount: Number(dynamic?.viewCount ?? 0) + 1,
      likeCount: Number(dynamic?.likeCount) || 0,
      saveCount: Number(dynamic?.saveCount) || 0,
      isLiked: !!dynamic?.isLiked,
      isSaved: !!dynamic?.isSaved,
    };
  });

  return { data: videosWithMedia };
};
