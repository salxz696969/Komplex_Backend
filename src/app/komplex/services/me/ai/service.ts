import { db } from "@/db/index.js";
import { redis } from "@/db/redis/redisConfig.js";
import { userAIHistory } from "@/db/schema.js";
import { AuthenticatedRequest } from "@/types/request.js";
import { Request, response, Response } from "express";
import { eq, desc } from "drizzle-orm";
import axios from "axios";

export const callAiAndWriteToHistory = async (prompt: string, language: string, userId: number) => {
	try {
		const cacheKey = `previousContext:${userId}`;
		const cacheRaw = await redis.get(cacheKey);
		const cacheData = cacheRaw ? JSON.parse(cacheRaw) : null;
		let previousContext = null;
		if (Array.isArray(cacheData) && cacheData.length >= 5) {
			previousContext = cacheData;
		} else {
			previousContext = await db
				.select({
					prompt: userAIHistory.prompt,
					aiResult: userAIHistory.aiResult,
				})
				.from(userAIHistory)
				.where(eq(userAIHistory.userId, Number(userId)))
				.orderBy(desc(userAIHistory.createdAt))
				.limit(5)
				.then((res) => res.map((r) => r.prompt).join("\n"));
		}
		const response = await axios.post(`${process.env.FAST_API_KEY}`, {
			input: prompt,
			language,
			previousContext,
		});
		const result = response.data;
		const aiResult = result.result;
		if (aiResult) {
			const newHistory = await db
				.insert(userAIHistory)
				.values({
					userId: Number(userId),
					prompt: prompt,
					aiResult: aiResult,
				})
				.returning();
			const newCacheData = await db
				.select({
					prompt: userAIHistory.prompt,
					aiResult: userAIHistory.aiResult,
				})
				.from(userAIHistory)
				.where(eq(userAIHistory.userId, Number(userId)))
				.orderBy(desc(userAIHistory.createdAt))
				.limit(4)
				.then((res) => res.map((r) => r.prompt).join("\n"));
			await redis.set(cacheKey, JSON.stringify([...newCacheData, ...newHistory]), { EX: 60 * 60 * 24 });
		}
		return { data: { prompt, aiResult } };
	} catch (error) {
		throw new Error((error as Error).message);
	}
};
