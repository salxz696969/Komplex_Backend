import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as blogService from "@/app/komplex/services/feed/blogs/service.js";

export const getAllBlogsController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: 1 };
    const { type, topic, page } = req.query;
    const result = await blogService.getAllBlogs(
      type as string,
      topic as string,
      page as string,
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

export const getBlogByIdController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId ?? "1";
    const result = await blogService.getBlogById(id, Number(userId));
    return res.status(200).json(result.data);
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
