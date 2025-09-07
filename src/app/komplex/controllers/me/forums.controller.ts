import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as forumService from "@/app/komplex/services/me/forums/service.js";
import * as forumByIdService from "@/app/komplex/services/me/forums/[id]/service.js";

export const getAllMyForumsController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: 1 };
    const result = await forumService.getAllMyForums(req.query, Number(userId));
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const postForumController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: 1 };
    const result = await forumService.postForum(
      req.body,
      req.files,
      Number(userId)
    );
    return res.status(201).json(result);
  } catch (error) {
    if ((error as Error).message === "Missing required fields") {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }
    return res
      .status(500)
      .json({ success: false, error: (error as Error).message });
  }
};

export const likeForumController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };
    const result = await forumByIdService.likeForum(id, Number(userId));
    return res.status(200).json(result);
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

export const unlikeForumController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };
    const result = await forumByIdService.unlikeForum(id, Number(userId));
    return res.status(200).json(result);
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

export const updateForumController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: "1" };
    const { id } = req.params;
    const result = await forumByIdService.updateForum(
      id,
      req.body,
      req.files,
      Number(userId)
    );
    return res.status(200).json(result);
  } catch (error) {
    if ((error as Error).message === "Forum not found") {
      return res
        .status(404)
        .json({ success: false, message: "Forum not found" });
    }
    if ((error as Error).message === "Invalid photosToRemove format") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid photosToRemove format" });
    }
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const deleteForumController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: "1" };
    const { id } = req.params;
    const result = await forumByIdService.deleteForum(id, Number(userId));
    return res.status(200).json(result);
  } catch (error) {
    if ((error as Error).message === "Forum not found") {
      return res
        .status(404)
        .json({ success: false, message: "Forum not found" });
    }
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};
