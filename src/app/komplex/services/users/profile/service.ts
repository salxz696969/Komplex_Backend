import { db } from "@/db/index.js";
import { redis } from "@/db/redis/redisConfig.js";
import { users } from "@/db/schema.js";
import { eq } from "drizzle-orm";

export const getUserProfile = async (userId: number) => {
  try {
    const cacheKey = `user:${userId}:profile`;
    const cachedProfile = await redis.get(cacheKey);
    if (cachedProfile) {
      return { data: JSON.parse(cachedProfile) };
    }
    const userProfile = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    await redis.set(cacheKey, JSON.stringify(userProfile), { EX: 300 });
    return { data: userProfile };
  } catch (error) {
    throw new Error("Failed to get user profile");
  }
};
