import { Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as aiService from "@/app/komplex/services/me/ai/service.js";

export const callAiAndWriteToHistory = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: "1" };
    const { prompt, language } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: "Prompt is required",
      });
    }

    const result = await aiService.callAiAndWriteToHistory(
      prompt,
      language,
      Number(userId)
    );

    return res.status(200).json(result.data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};
