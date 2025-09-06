import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as blogService from "@/app/komplex/services/me/blogs/service.js";
import * as blogByIdService from "@/app/komplex/services/me/blogs/[id]/service.js";

export const getAllMyBlogsController = async (
  req: Request,
  res: Response
) => {
  try {
    let userId = 1; // just assuming, //TODO: change
    const result = await blogService.getAllMyBlogs(userId);
    return res.status(200).json(result.data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const postBlogController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: 1 };
    const result = await blogService.postBlog(
      req.body,
      req.files,
      Number(userId)
    );
    return res.status(201).json(result.data);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: (error as Error).message });
  }
};

export const saveBlogController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };
    const result = await blogByIdService.saveBlog(id, Number(userId));
    return res.status(200).json(result.data);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: (error as Error).message });
  }
};

export const unsaveBlogController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };
    const result = await blogByIdService.unsaveBlog(id, Number(userId));
    return res.status(200).json(result.data);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: (error as Error).message });
  }
};

export const updateBlogController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };
    const result = await blogByIdService.updateBlog(
      id,
      req.body,
      req.files,
      Number(userId)
    );
    return res.status(200).json(result.data);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: (error as Error).message });
  }
};

export const deleteBlogController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };
    const result = await blogByIdService.deleteBlog(id, Number(userId));
    return res.status(200).json(result.data);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: (error as Error).message });
  }
};
