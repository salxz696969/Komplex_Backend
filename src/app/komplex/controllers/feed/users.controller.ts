import { Request, Response } from "express";
import { followers } from "../../../../db/models/followers.js";
import { db } from "../../../../db/index.js";
import { eq, and, inArray, sql } from "drizzle-orm";
import { AuthenticatedRequest } from "../../../../types/request.js";
import { redis } from "../../../../db/redis/redisConfig.js";

export const getUserFollowers = async (
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

export const followUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.user ?? { userId: "1" };
    const { id: followedId } = req.params;

    if (!userId || !followedId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing userId or followedId" });
    }

    const follow = await db
      .insert(followers)
      .values({
        userId: Number(userId),
        followedId: Number(followedId),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const cacheKey = `followers:userId:${userId}`;
    const redisData = await redis.get(cacheKey);
    if (redisData) {
      await redis.set(
        cacheKey,
        JSON.stringify([...JSON.parse(redisData), follow]),
        { EX: 60 * 60 * 24 }
      );
    } else {
      await redis.set(cacheKey, JSON.stringify([follow]), { EX: 60 * 60 * 24 });
    }

    return res.status(200).json({ success: true, follow });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: (error as Error).message });
  }
};

export const unfollowUser = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: "1" };
    const { id } = req.params;

    if (!userId || !id) {
      return res
        .status(400)
        .json({ success: false, message: "Missing userId or followedId" });
    }

    const unfollow = await db
      .delete(followers)
      .where(
        and(
          eq(followers.userId, Number(userId)),
          eq(followers.followedId, Number(id))
        )
      )
      .returning();
    await redis.del(`followers:userId:${userId}`);

    return res.status(200).json({ success: true, unfollow });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: (error as Error).message });
  }
};
