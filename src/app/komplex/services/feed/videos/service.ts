import { Response } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/index.js";
import {
  videos,
  users,
  userSavedVideos,
  videoLikes,
} from "@/db/schema.js";
import { AuthenticatedRequest } from "@/types/request.js";

export const getAllVideos = async (
  req: AuthenticatedRequest,
  res: Response
) => {
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

    return res.status(200).json(videoRows);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: (error as Error).message });
  }
};
