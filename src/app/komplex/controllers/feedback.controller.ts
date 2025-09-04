import { Request, Response } from "express";
import { db } from "../../../db/index.js";
import { feedbacks } from "../../../db/models/feedbacks.js";
// import { feedbackMedia } from "../../../db/models/feedback_media";

export const createFeedback = async (req: Request, res: Response) => {
  try {

    // No files upload for now
    const userId = 1;
    const { content, type } = req.body;
    const feedback = await db
      .insert(feedbacks)
      .values({
        content,
        type,
        userId,
        status: "unresolved",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: "Failed to create feedback" });
  }
};
