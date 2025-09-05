import { eq, and } from "drizzle-orm";
import { Request, Response } from "express";
import { db } from "@/db/index.js";
import { forumReplyLikes } from "@/db/models/forum_reply_like.js";
import { AuthenticatedRequest } from "@/types/request.js";

export const likeForumCommentReplyController = async (
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
      .insert(forumReplyLikes)
      .values({
        userId: Number(userId),
        forumReplyId: Number(id),
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

export const unlikeForumCommentReplyController = async (
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
      .delete(forumReplyLikes)
      .where(
        and(
          eq(forumReplyLikes.userId, Number(userId)),
          eq(forumReplyLikes.forumReplyId, Number(id))
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
