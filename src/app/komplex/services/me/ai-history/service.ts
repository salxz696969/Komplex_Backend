import { and, eq, sql, desc } from "drizzle-orm";
import { db } from "@/db/index.js";
import { redis } from "@/db/redis/redisConfig.js";
import { userAIHistory } from "@/db/schema.js";

export const getAiHistoryForAUser = async (userId: number) => {
  const cacheKey = `aiHistory:userId:${userId}`;
  const redisData = await redis.get(cacheKey);
  if (redisData) {
    return { data: JSON.parse(redisData) };
  }
  const aiHistory = await db
    .select()
    .from(userAIHistory)
    .where(eq(userAIHistory.userId, Number(userId)))
    .orderBy(desc(userAIHistory.createdAt));
  await redis.set(cacheKey, JSON.stringify(aiHistory), { EX: 60 * 60 * 24 });
  return { data: aiHistory };
};

export const postAiHistoryForAUser = async (body: any, userId: number) => {
  const { prompt, result } = body;

  if (!prompt || !result) {
    throw new Error("Missing prompt or result");
  }

  const [newAiHistory] = await db
    .insert(userAIHistory)
    .values({
      userId: Number(userId),
      prompt,
      aiResult: result,
    })
    .returning();
  const cacheKey = `aiHistory:userId:${userId}`;
  const redisData = await redis.get(cacheKey);
  if (redisData) {
    await redis.set(
      cacheKey,
      JSON.stringify([...JSON.parse(redisData), newAiHistory]),
      { EX: 60 * 60 * 24 }
    );
  } else {
    await redis.set(cacheKey, JSON.stringify([newAiHistory]), {
      EX: 60 * 60 * 24,
    });
  }

  return { data: newAiHistory };
};
