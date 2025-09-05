import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as blogService from "@/app/komplex/services/me/blogs/service.js";
import * as blogByIdService from "@/app/komplex/services/me/blogs/[id]/service.js";

export const getAllUserBlogsController = async (
  req: Request,
  res: Response
) => {
  try {
    let userId = 1; // just assuming, //TODO: change
    const result = await blogService.getAllUserBlogs(userId);
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
    const result = await blogByIdService.getBlogById(id, Number(userId));
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
