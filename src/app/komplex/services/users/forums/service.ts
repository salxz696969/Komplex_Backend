import { db } from "@/db/index.js";
import { redis } from "@/db/redis/redisConfig.js";
import { forums, forumMedias, users } from "@/db/schema.js";
import { desc, eq, sql } from "drizzle-orm";

export const getUserForums = async (userId: number) => {
  try {
    const cacheKey = `user:${userId}:forums`;

    // Try to get from cache first
    const cachedForums = await redis.get(cacheKey);
    if (cachedForums) {
      return { data: JSON.parse(cachedForums) };
    }

    const userForums = await db
      .select({
        id: forums.id,
        userId: forums.userId,
        title: forums.title,
        description: forums.description,
        type: forums.type,
        topic: forums.topic,
        viewCount: forums.viewCount,
        createdAt: forums.createdAt,
        updatedAt: forums.updatedAt,
        mediaUrl: forumMedias.url,
        mediaType: forumMedias.mediaType,
        username: sql`${users.firstName} || ' ' || ${users.lastName}`,
      })
      .from(forums)
      .leftJoin(forumMedias, eq(forums.id, forumMedias.forumId))
      .leftJoin(users, eq(forums.userId, users.id))
      .where(eq(forums.userId, userId))
      .orderBy(desc(forums.createdAt));

    // Group forums by ID and collect media
    const forumMap = new Map<number, any>();
    for (const forum of userForums) {
      if (!forumMap.has(forum.id)) {
        const formatted = {
          id: forum.id,
          userId: forum.userId,
          title: forum.title,
          description: forum.description,
          type: forum.type,
          topic: forum.topic,
          viewCount: forum.viewCount,
          createdAt: forum.createdAt,
          updatedAt: forum.updatedAt,
          username: forum.username,
          media: [] as { url: string; type: string }[],
        };
        forumMap.set(forum.id, formatted);
      }

      if (forum.mediaUrl) {
        forumMap.get(forum.id).media.push({
          url: forum.mediaUrl,
          type: forum.mediaType,
        });
      }
    }

    const forumsWithMedia = Array.from(forumMap.values());

    // Cache for 5 minutes
    await redis.set(cacheKey, JSON.stringify(forumsWithMedia), { EX: 300 });

    return { data: forumsWithMedia };
  } catch (error) {
    throw new Error("Failed to get user forums");
  }
};
