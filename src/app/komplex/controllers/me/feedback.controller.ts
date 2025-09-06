import { AuthenticatedRequest } from "@/types/request.js";
import { createFeedback } from "../../services/me/feedbacks/service.js";
import { Response } from "express";

export const createFeedbackController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: 1 };
    const result = await createFeedback(req.body, Number(userId));
    return res.status(201).json(result.data);
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};
