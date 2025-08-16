import { db } from "../../../db";
import {
  videoComments,
  videoLikes,
  videos,
  userSavedVideos,
} from "../../../db/schema";
import { Request, Response } from "express";
import { eq, sql } from "drizzle-orm";
import { videoReplies } from "../../../db/schema";

export const getAllVideos = async (req: Request, res: Response) => {
  try {
    // Get all videos with basic info
    const videosData = await db.select().from(videos);

    // Process each video to get related stats
    const videosWithStats = await Promise.all(
      videosData.map(async (video) => {
        // Get like count
        const likeCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(videoLikes)
          .where(eq(videoLikes.videoId, video.id));

        // Get comment count
        const commentCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(videoComments)
          .where(eq(videoComments.videoId, video.id));

        // Get reply count
        const replyCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(videoReplies)
          .leftJoin(
            videoComments,
            eq(videoComments.id, videoReplies.videoCommentId)
          )
          .where(eq(videoComments.videoId, video.id));

        // Get save count
        const saveCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(userSavedVideos)
          .where(eq(userSavedVideos.videoId, video.id));

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
