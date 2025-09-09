import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as forumCommentService from "@/app/komplex/services/feed/forum-comments/service.js";

export const getAllCommentsForAForumController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };
    const { page } = req.query;
    const pageNumber = Number(page) || 1;

    const result = await forumCommentService.getAllCommentsForAForum(
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
