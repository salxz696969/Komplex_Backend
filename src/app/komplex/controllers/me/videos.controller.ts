import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as videoService from "@/app/komplex/services/me/videos/service.js";
import * as videoByIdService from "@/app/komplex/services/me/videos/[id]/service.js";

export const getAllVideosController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: 1 };
    const result = await videoService.getAllVideos(req.query, Number(userId));
    return res.status(200).json(result.data);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: (error as Error).message });
  }
};

export const getVideoByIdController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: 1 };
    const videoId = Number(req.params.id);

    if (!videoId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing video id" });
    }

    const result = await videoByIdService.getVideoById(videoId, Number(userId));
    return res.status(200).json(result.data);
  } catch (error) {
    if ((error as Error).message === "Video not found") {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }
    return res
      .status(500)
      .json({ success: false, error: (error as Error).message });
  }
};

export const likeVideoController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };
    const result = await videoByIdService.likeVideo(Number(id), Number(userId));
    return res.status(200).json(result.data);
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const unlikeVideoController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };
    const result = await videoByIdService.unlikeVideo(
      Number(id),
      Number(userId)
    );
    return res.status(200).json(result.data);
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const saveVideoController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: "1" };
    const result = await videoByIdService.saveVideo(Number(id), Number(userId));
    return res.status(200).json(result.data);
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const unsaveVideoController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: "1" };
    const result = await videoByIdService.unsaveVideo(
      Number(id),
      Number(userId)
    );
    return res.status(200).json(result.data);
  } catch (error) {
    if ((error as Error).message === "Unauthorized") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if ((error as Error).message === "Video not found") {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const updateVideoController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: "1" };
    const { id } = req.params;

    if (
      !id ||
      !req.body.title ||
      !req.body.description ||
      !req.body.type ||
      !req.body.topic
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const result = await videoByIdService.updateVideo(
      Number(id),
      req.body,
      req.files,
      Number(userId)
    );
    return res.status(200).json(result.data);
  } catch (error) {
    if ((error as Error).message === "Video not found") {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const deleteVideoController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: "1" };
    const { id } = req.params;
    const result = await videoByIdService.deleteVideo(
      Number(id),
      Number(userId)
    );
    return res.status(200).json(result.data);
  } catch (error) {
    if ((error as Error).message === "Video not found or unauthorized") {
      return res
        .status(404)
        .json({ success: false, message: "Video not found or unauthorized" });
    }
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const getUserVideoHistoryController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: "1" };
    const result = await videoService.getUserVideoHistory(Number(userId));
    return res.status(200).json(result.data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};
