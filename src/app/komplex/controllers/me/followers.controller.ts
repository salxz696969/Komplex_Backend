import { db } from "@/db/index.js";
import { followers } from "@/db/models/followers.js";
import { AuthenticatedRequest } from "@/types/request.js";
import { redis } from "@/db/redis/redisConfig.js";
import { eq } from "drizzle-orm";
import { Response } from "express";
import * as followServiceById from "@/app/komplex/services/me/follow/[id]/service.js";
import * as followService from "@/app/komplex/services/me/follow/service.js";

export const getUserFollowersController = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user;
		const { page, limit, offset } = req.query;

		const result = await followService.getFollowersService(
			Number(userId),
			Number(page),
			Number(limit),
			Number(offset)
		);

		res.status(200).json(result);
	} catch (error) {
		res.status(500).json({ success: false, error: (error as Error).message });
	}
};

export const followUserController = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user;
		const { id } = req.params;
		await followService.followUserService(Number(userId), Number(id));
		res.status(200).json({ message: "Successfully followed the user." });
	} catch (error) {
		res.status(500).json({ success: false, error: (error as Error).message });
	}
};

export const unfollowUserController = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user;
		const { id } = req.params;
		await followServiceById.unfollowUserService(Number(userId), Number(id));
		res.status(200).json({ message: "Successfully unfollowed the user." });
	} catch (error) {
		res.status(500).json({ success: false, error: (error as Error).message });
	}
};

export const getFollowingController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.user;
    const { page, limit, offset } = req.query;

    const result = await followService.getFollowingService(
      Number(userId),
      Number(page),
      Number(limit),
      Number(offset)
    );

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};
