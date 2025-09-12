import { Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as videoCommentService from "@/app/komplex/services/feed/video-comments/service.js";

export const getVideoCommentsController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { page } = req.query;
    const pageNumber = Number(page) || 1;

    const result = await videoCommentService.getAllVideoCommentsForAVideo(
      id,
      Number(userId),
      pageNumber
    );

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};
