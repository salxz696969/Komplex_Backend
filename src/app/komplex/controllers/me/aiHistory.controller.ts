import { Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as aiHistoryService from "@/app/komplex/services/me/ai-history/service.js";

export const getAiHistoryForAUserController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: "1" };
    const result = await aiHistoryService.getAiHistoryForAUser(Number(userId));
    return res.status(200).json(result.data);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: (error as Error).message });
  }
};

export const postAiHistoryForAUserController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: "1" };
    const result = await aiHistoryService.postAiHistoryForAUser(
      req.body,
      Number(userId)
    );
    return res.status(201).json(result.data);
  } catch (error) {
    if ((error as Error).message === "Missing prompt or result") {
      return res
        .status(400)
        .json({ success: false, error: "Missing prompt or result" });
    }
    return res
      .status(500)
      .json({ success: false, error: (error as Error).message });
  }
};
