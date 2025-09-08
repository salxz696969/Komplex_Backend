import { Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as forumReplyService from "@/app/komplex/services/feed/forum-replies/service.js";

export const getForumCommentsRepliesController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };
    const { page } = req.query;
    const pageNumber = Number(page) || 1;

    const result = await forumReplyService.getAllRepliesForAComment(
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
