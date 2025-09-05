import { Response } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/index.js";
import {
  videos,
  users,
  userSavedVideos,
  videoLikes,
  userVideoHistory,
} from "@/db/schema.js";
import { AuthenticatedRequest } from "@/types/request.js";

export const getVideoById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: 1 };
    const videoId = Number(req.params.id);

    if (!videoId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing video id" });
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

    if (!videoRow) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }

    return res.status(200).json(videoRow);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: (error as Error).message });
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
