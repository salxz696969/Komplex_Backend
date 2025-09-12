import { Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as aiService from "@/app/komplex/services/me/ai/service.js";

export const callAiAndWriteToHistory = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user.userId;
    const { prompt, language } = req.body;

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

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const getMyAiHistoryController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user.userId;
    const { page, limit } = req.query;

    const result = await aiService.getAiHistory(
      Number(userId),
      Number(page),
      Number(limit)
    );

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};
