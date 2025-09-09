import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as videoCommentService from "@/app/komplex/services/me/video-comments/service.js";
import * as videoCommentByIdService from "@/app/komplex/services/me/video-comments/[id]/service.js";

export const postVideoCommentController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;
    const { description } = req.body;
    const { id } = req.params;
    const files = req.files;

    const result = await videoCommentService.postVideoComment(
      id,
      userId,
      description,
      files
    );

    return res.status(201).json(result.data);
  } catch (error) {
    if ((error as Error).message === "Missing required fields") {
      return res.status(400).json({
        success: false,
        message: (error as Error).message,
      });
    }
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const updateVideoCommentController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { description, mediasToRemove } = req.body;
    const files = req.files;

    const result = await videoCommentByIdService.updateVideoComment(
      id,
      userId,
      description,
      mediasToRemove,
      files
    );

    return res.status(200).json(result.data);
  } catch (error) {
    if ((error as Error).message === "Comment not found") {
      return res.status(404).json({
        success: false,
        message: (error as Error).message,
      });
    }
    if ((error as Error).message === "Invalid mediasToRemove format") {
      return res.status(400).json({
        success: false,
        message: (error as Error).message,
      });
    }
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const deleteVideoCommentController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const result = await videoCommentByIdService.deleteVideoComment(id, userId);

    return res.status(200).json(result.data);
  } catch (error) {
    if ((error as Error).message === "Comment not found") {
      return res.status(404).json({
        success: false,
        message: (error as Error).message,
      });
    }
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const likeVideoCommentController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const result = await videoCommentByIdService.likeVideoComment(id, userId);

    return res.status(200).json(result.data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const unlikeVideoCommentController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const result = await videoCommentByIdService.unlikeVideoComment(id, userId);

    return res.status(200).json(result.data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};
