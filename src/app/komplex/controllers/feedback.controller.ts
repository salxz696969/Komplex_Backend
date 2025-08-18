import { Request, Response } from "express";
import { db } from "../../../db";
import { feedbacks } from "../../../db/models/feedbacks";
// import { feedbackMedia } from "../../../db/models/feedback_media";

export const createFeedback = async (req: Request, res: Response) => {
  try {
    //! files upload is not implemented yet
    const userId = 1;
    const { content, type } = req.body;
    // const files = req.files;
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
    // if (files) {
    //   for (const file of Object.values(files)) {
    //     await db.insert(feedbackMedia).values({
    //       feedbackId: feedback[0].id,
    //       publicUrl: file.path,
    //       mediaType: file.mimetype,
    //     });
    //   }
    // }
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: "Failed to create feedback" });
  }
};
