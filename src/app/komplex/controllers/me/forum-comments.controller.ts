import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as forumCommentService from "@/app/komplex/services/me/forum-comments/service.js";
import * as forumCommentByIdService from "@/app/komplex/services/me/forum-comments/[id]/service.js";

export const updateForumCommentController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: 1 };
    const { id } = req.params;
    const result = await forumCommentByIdService.updateForumComment(
      id,
      req.body,
      req.files,
      Number(userId)
    );
    return res.status(200).json(result.data);
  } catch (error) {
    if ((error as Error).message === "Comment not found") {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }
    if ((error as Error).message === "Invalid photosToRemove format") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid photosToRemove format" });
    }
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const deleteForumCommentController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: 1 };
    const { id } = req.params;
    const result = await forumCommentByIdService.deleteForumComment(
      id,
      Number(userId)
    );
    return res.status(200).json(result.data);
  } catch (error) {
    if ((error as Error).message === "Comment not found") {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const postForumCommentController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: 1 };
    const { id } = req.params;
    const result = await forumCommentService.postForumComment(
      id,
      req.body,
      req.files,
      Number(userId)
    );
    return res.status(201).json(result.data);
  } catch (error) {
    if ((error as Error).message === "Missing required fields") {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const likeForumCommentController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: 1 };
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const result = await forumCommentByIdService.likeForumComment(
      id,
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

export const unlikeForumCommentController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: 1 };
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const result = await forumCommentByIdService.unlikeForumComment(
      id,
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
