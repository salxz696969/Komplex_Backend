import { db } from "@/db/index.js";
import { feedbacks } from "@/db/schema.js";
import { redis } from "@/db/redis/redisConfig.js";

export const createFeedback = async (
  content: string,
  type: string,
  userId: number
) => {
  try {
    // No files upload for now
    const userID = userId === 0 ? null : userId;
    const feedback = await db
      .insert(feedbacks)
      .values({
        content,
        type,
        userId: userID,
        status: "unresolved",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    const cacheKey = `feedback:${feedback[0].id}`;
    await redis.set(cacheKey, JSON.stringify(feedback[0]), { EX: 600 });
    return { data: feedback };
  } catch (error) {
    throw new Error((error as Error).message);
  }
};
