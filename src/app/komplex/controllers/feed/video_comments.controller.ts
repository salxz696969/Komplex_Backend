import { eq, and } from "drizzle-orm";
import { Request, Response } from "express";
import { db } from "@/db/index.js";
import { videoCommentLike } from "@/db/models/video_comment_like.js";
import { AuthenticatedRequest } from "@/types/request.js";

export const likeVideoCommentController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const like = await db
      .insert(videoCommentLike)
      .values({
        userId: Number(userId),
        videoCommentId: Number(id),
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

export const unlikeVideoCommentController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const unlike = await db
      .delete(videoCommentLike)
      .where(
        and(
          eq(videoCommentLike.userId, Number(userId)),
          eq(videoCommentLike.videoCommentId, Number(id))
        )
      )
      .returning();

    return res.status(200).json({ unlike });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};
