import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as videoReplyService from "@/app/komplex/services/feed/video-replies/service.js";

export const getAllVideoRepliesForACommentController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { page } = req.query;
    const pageNumber = Number(page) || 1;

    const result = await videoReplyService.getAllVideoRepliesForAComment(
      id,
      userId,
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
