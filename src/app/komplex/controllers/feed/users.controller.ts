import { Request, Response } from "express";
import { followers } from "@/db/models/followers.js";
import { db } from "@/db/index.js";
import { eq } from "drizzle-orm";
import { AuthenticatedRequest } from "@/types/request.js";
import { redis } from "@/db/redis/redisConfig.js";

export const getUserFollowersController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: "1" };
    const cacheKey = `followers:userId:${userId}`;
    const redisData = await redis.get(cacheKey);
    if (redisData) {
      return res.status(200).json({ success: true, data: redisData });
    }
    const followersList = await db
      .select()
      .from(followers)
      .where(eq(followers.followedId, Number(userId)));
    await redis.set(cacheKey, JSON.stringify(followersList), {
      EX: 60 * 60 * 24,
    });
    res.status(200).json({ success: true, data: followersList });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};
