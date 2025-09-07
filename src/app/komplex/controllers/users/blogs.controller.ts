import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as blogService from "@/app/komplex/services/users/blogs/service.js";

export const getUserBlogsController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const result = await blogService.getUserBlogs(Number(userId));
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};
