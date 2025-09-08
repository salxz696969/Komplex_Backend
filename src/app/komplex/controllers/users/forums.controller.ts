import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as forumService from "@/app/komplex/services/users/forums/service.js";

export const getUserForumsController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { page, topic, type } = req.query;
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const result = await forumService.getUserForums(Number(userId), page as string);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};
