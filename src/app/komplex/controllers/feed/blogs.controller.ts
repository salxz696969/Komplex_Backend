import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as blogService from "@/app/komplex/services/feed/blogs/service.js";
import * as blogByIdService from "@/app/komplex/services/feed/blogs/[id]/service.js";

export const getAllBlogsController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user.userId;
    const { type, topic, page } = req.query;
    const result = await blogService.getAllBlogs(
      type as string,
      topic as string,
      page as string,
      Number(userId)
    );
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const getBlogByIdController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const result = await blogByIdService.getBlogById(id, Number(userId));
    return res.status(200).json(result);
  } catch (error) {
    if ((error as Error).message === "Blog not found") {
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });
    }
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};
