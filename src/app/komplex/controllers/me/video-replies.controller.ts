import { Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as videoReplyService from "@/app/komplex/services/me/video-replies/service.js";
import * as videoReplyByIdService from "@/app/komplex/services/me/video-replies/[id]/service.js";

export const postVideoReplyController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;
    const { description } = req.body;
    const { id } = req.params;
    const files = req.files;

    const result = await videoReplyService.postVideoReply(
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

export const updateVideoReplyController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { description, videosToRemove } = req.body;
    const files = req.files;

    const result = await videoReplyByIdService.updateVideoReply(
      id,
      userId,
      description,
      videosToRemove,
      files
    );

    return res.status(200).json(result.data);
  } catch (error) {
    if ((error as Error).message === "Video reply not found") {
      return res.status(404).json({
        success: false,
        message: (error as Error).message,
      });
    }
    if ((error as Error).message === "Invalid videosToRemove format") {
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

export const deleteVideoReplyController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const result = await videoReplyByIdService.deleteVideoReply(id, userId);

    return res.status(200).json(result.data);
  } catch (error) {
    if ((error as Error).message === "Video reply not found") {
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

export const likeVideoReplyController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const result = await videoReplyByIdService.likeVideoReply(id, userId);

    return res.status(200).json(result.data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const unlikeVideoReplyController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const result = await videoReplyByIdService.unlikeVideoReply(id, userId);

    return res.status(200).json(result.data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};
