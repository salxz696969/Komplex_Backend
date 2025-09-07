import { and, eq, sql, desc, inArray } from "drizzle-orm";
import { db } from "@/db/index.js";
import { redis } from "@/db/redis/redisConfig.js";
import {
  videos,
  users,
  userSavedVideos,
  videoLikes,
  followers,
} from "@/db/schema.js";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";

export const getAllVideos = async (
  type?: string,
  topic?: string,
  page?: string,
  userId?: number
) => {
  try {
    const conditions = [];
    if (type) conditions.push(eq(videos.type, type));
    if (topic) conditions.push(eq(videos.topic, topic));

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
        desc(
          sql`CASE WHEN DATE(${videos.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END`
        ),
        desc(videos.viewCount),
        desc(videos.updatedAt),
        desc(
          sql`(SELECT COUNT(*) FROM ${videoLikes} WHERE ${videoLikes.videoId} = ${videos.id})`
        )
      )
      .limit(5);

    // 1️⃣ Fetch filtered video IDs from DB
    const videoIds = await db
      .select({ id: videos.id })
      .from(videos)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(
        desc(
          sql`CASE WHEN DATE(${videos.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END`
        ),
        desc(videos.viewCount),
        desc(videos.updatedAt),
        desc(
          sql`(SELECT COUNT(*) FROM ${videoLikes} WHERE ${videoLikes.videoId} = ${videos.id})`
        )
      )
      .offset(offset)
      .limit(limit);

    const videoIdRows = Array.from(
      new Set([
        ...followedUsersVideosId.map((f) => f.id),
        ...videoIds.map((f) => f.id),
      ])
    ).map((id) => ({ id }));

    if (!videoIdRows.length) {
      return { data: [], hasMore: false };
    }

    // 2️⃣ Fetch videos from Redis in one call
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
        isLike: sql`CASE WHEN ${videoLikes.videoId} IS NOT NULL THEN true ELSE false END`,
        isSave: sql`CASE WHEN ${userSavedVideos.videoId} IS NOT NULL THEN true ELSE false END`,
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
        isLike: !!dynamic?.isLike,
        isSave: !!dynamic?.isSave,
      };
    });

    return { data: videosWithMedia, hasMore: allVideos.length === limit };
  } catch (error) {
    throw new Error((error as Error).message);
  }
};
