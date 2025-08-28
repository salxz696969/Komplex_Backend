import { db } from "../../../db";
import {
  videoComments,
  videoLikes,
  videos,
  userSavedVideos,
  users,
} from "../../../db/schema";
import { Request, Response } from "express";
import { eq, sql } from "drizzle-orm";
import { videoReplies } from "../../../db/schema";

export const getAllVideos = async (req: Request, res: Response) => {
  try {
    // Get all videos with basic info
    const videosData = await db
      .select()
      .from(videos)
      .groupBy(
        videos.id,
        videos.userId,
        videos.title,
        videos.description,
        videos.viewCount,
        videos.duration
      );

    // Process each video to get related stats
    const videosWithStats = await Promise.all(
      videosData.map(async (video) => {
        // Get like count
        const likeCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(videoLikes)
          .where(eq(videoLikes.videoId, video.id))
          .groupBy(videoLikes.videoId, videoLikes.userId);

        // Get comment count
        const commentCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(videoComments)
          .where(eq(videoComments.videoId, video.id))
          .groupBy(videoComments.videoId, videoComments.userId);

        // Get reply count
        const replyCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(videoReplies)
          .leftJoin(
            videoComments,
            eq(videoComments.id, videoReplies.videoCommentId)
          )
          .where(eq(videoComments.videoId, video.id))
          .groupBy(videoComments.videoId, videoComments.userId);

        // Get save count
        const saveCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(userSavedVideos)
          .where(eq(userSavedVideos.videoId, video.id))
          .groupBy(userSavedVideos.videoId, userSavedVideos.userId);

        let username;
        if (video.userId) {
          const user = await db
            .select()
            .from(users)
            .where(eq(users.id, video.userId))
            .groupBy(users.id, users.firstName, users.lastName);

          username = user[0]?.firstName + " " + user[0]?.lastName;
        }

        return {
          id: video.id,
          title: video.title,
          description: video.description,
          viewCount: Number(video.viewCount),
          duration: Number(video.duration),
          videoUrl: video.videoUrl,
          thumbnailUrl: video.thumbnailUrl,
          likeCount: Number(likeCount[0]?.count || 0),
          commentCount: Number(commentCount[0]?.count || 0),
          replyCount: Number(replyCount[0]?.count || 0),
          saveCount: Number(saveCount[0]?.count || 0),
          username: username,
          createdAt: video.createdAt,
          updatedAt: video.updatedAt,
        };
      })
    );

    return res.status(200).json(videosWithStats);
  } catch (error: any) {
    console.error("Get all videos error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getVideoById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const video = await db
      .select()
      .from(videos)
      .where(eq(videos.id, Number(id)))
      .groupBy(
        videos.id,
        videos.userId,
        videos.title,
        videos.description,
        videos.viewCount,
        videos.duration
      );
    return res.status(200).json(video);
  } catch (error: any) {
    console.error("Get video by id error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
