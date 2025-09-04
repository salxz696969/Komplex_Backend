import { Request, Response } from "express";
import { feedbacks } from "../../../db/models/feedbacks.js";
import { db } from "../../../db/index.js";
import { desc, eq } from "drizzle-orm";
import { users } from "../../../db/models/users.js";
import { feedbackMedia } from "../../../db/models/feedback_media.js";

export const getFeedbacks = async (req: Request, res: Response) => {
  try {
    const fullResult = await db
      .select()
      .from(feedbacks)
      .leftJoin(users, eq(feedbacks.userId, users.id))
      .orderBy(desc(feedbacks.createdAt));

    const result = [];
    for (const feedback of fullResult) {
      const feedbackMediaResult = await db
        .select({
          publicUrl: feedbackMedia.publicUrl,
          mediaType: feedbackMedia.mediaType,
        })
        .from(feedbackMedia)
        .where(eq(feedbackMedia.feedbackId, feedback.feedbacks.id));

      result.push({
        id: feedback.feedbacks.id,
        content: feedback.feedbacks.content,
        username: `${feedback.users?.firstName} ${feedback.users?.lastName}`,
        type: feedback.feedbacks.type,
        status: feedback.feedbacks.status,
        createdAt: feedback.feedbacks.createdAt,
        updatedAt: feedback.feedbacks.updatedAt,
        media: feedbackMediaResult,
      });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to get feedbacks" });
  }
};

export const updateFeedbackStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await db
      .update(feedbacks)
      .set({ status })
      .where(eq(feedbacks.id, Number(id)));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to update feedback status" });
  }
};
