import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as videoService from "@/app/komplex/services/users/videos/service.js";

export const getUserVideosController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const result = await videoService.getUserVideos(Number(id));
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};
