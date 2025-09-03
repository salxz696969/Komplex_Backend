import { and, eq, sql, desc } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { redis } from "../../../db/redis/redisConfig.js";
import { userAIHistory } from "../../../db/schema.js";
import { AuthenticatedRequest } from "../../utils/authenticatedRequest.js";
import { response, Response } from "express";
export const getAiHistoryForAUser = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: "1" };
		const cacheKey = `aiHistory:userId:${userId}`;
		const redisData = await redis.get(cacheKey);
		if (redisData) {
			return res.status(200).json({ success: true, data: redisData });
		}
		const aiHistory = await db
			.select()
			.from(userAIHistory)
			.where(eq(userAIHistory.userId, Number(userId)))
			.orderBy(desc(userAIHistory.createdAt));
		await redis.set(cacheKey, JSON.stringify(aiHistory), { EX: 60 * 60 * 24 });
		return res.status(200).json({ success: true, data: aiHistory });
	} catch (error) {
		return res.status(500).json({ success: false, error: (error as Error).message });
	}
};

export const postAiHistoryForAUser = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { prompt, result } = req.body;

		if (!prompt || !result) {
			return res.status(400).json({ success: false, error: "Missing prompt or result" });
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
			await redis.set(cacheKey, JSON.stringify([...JSON.parse(redisData), newAiHistory]), { EX: 60 * 60 * 24 });
		} else {
			await redis.set(cacheKey, JSON.stringify([newAiHistory]), { EX: 60 * 60 * 24 });
		}

		return res.status(201).json({ success: true, data: newAiHistory });
	} catch (error) {
		return res.status(500).json({ success: false, error: (error as Error).message });
	}
};
