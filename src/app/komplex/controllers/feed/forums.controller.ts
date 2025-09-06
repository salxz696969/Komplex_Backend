import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as forumService from "@/app/komplex/services/feed/forums/service.js";
import * as forumByIdService from "@/app/komplex/services/feed/forums/[id]/service.js";

export const getAllForumsController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: 1 };
    const result = await forumService.getAllForums(req.query, Number(userId));
    return res.status(200).json(result.data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const getForumByIdController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: "1" };
    const result = await forumByIdService.getForumById(id, Number(userId));
    return res.status(200).json(result.data);
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
