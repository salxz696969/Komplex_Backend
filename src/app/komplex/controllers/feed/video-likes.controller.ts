import { Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as videoLikeService from "@/app/komplex/services/feed/video-likes/service.js";

export const getVideoLikesController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;

    const result = await videoLikeService.getVideoLikes(id);

    return res.status(200).json(result.data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};
