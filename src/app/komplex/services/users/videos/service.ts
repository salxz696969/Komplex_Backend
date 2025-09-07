import { db } from "@/db/index.js";
import { redis } from "@/db/redis/redisConfig.js";
import { videos, users } from "@/db/schema.js";
import { desc, eq } from "drizzle-orm";

export const getUserVideos = async (userId: number) => {
  try {
    const cacheKey = `user:${userId}:videos`;

    // Try to get from cache first
    const cachedVideos = await redis.get(cacheKey);
    if (cachedVideos) {
      return { data: JSON.parse(cachedVideos) };
    }

    const userVideos = await db
      .select({
        id: videos.id,
        userId: videos.userId,
        title: videos.title,
        description: videos.description,
        type: videos.type,
        topic: videos.topic,
        duration: videos.duration,
        videoUrl: videos.videoUrl,
        thumbnailUrl: videos.thumbnailUrl,
        viewCount: videos.viewCount,
        createdAt: videos.createdAt,
        updatedAt: videos.updatedAt,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(videos)
      .leftJoin(users, eq(videos.userId, users.id))
      .where(eq(videos.userId, userId))
      .orderBy(desc(videos.createdAt));

    // Cache for 5 minutes
    await redis.set(cacheKey, JSON.stringify(userVideos), { EX: 300 });

    return { data: userVideos };
  } catch (error) {
    throw new Error("Failed to get user videos");
  }
};
