import { db } from "../../../db/index.js";
import { redis } from "../../../db/redis/redisConfig.js";
import { userAIHistory } from "../../../db/schema.js";
import { AuthenticatedRequest } from "../../../types/request.js";
import { Request, Response } from "express";
import { eq, desc } from "drizzle-orm";

export const callAiAndWriteToHistory = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { prompt, language } = req.body;
		const cacheKey = `previousContext:${userId}`;
		const cacheData = await redis.get(cacheKey);
		let previousContext = "";
		if (cacheData) {
			previousContext = JSON.parse(cacheData);
		} else {
			previousContext = await db
				.select({ prompt: userAIHistory.prompt, aiResult: userAIHistory.aiResult })
				.from(userAIHistory)
				.where(eq(userAIHistory.userId, Number(userId)))
				.orderBy(desc(userAIHistory.createdAt))
				.limit(5)
				.then((res) => res.map((r) => r.prompt).join("\n"));
		}
		const response = await fetch(`${process.env.FAST_API_KEY}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ input: prompt, language, previousContext }),
		});
		const result = await response.json();
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
				.select({ prompt: userAIHistory.prompt, aiResult: userAIHistory.aiResult })
				.from(userAIHistory)
				.where(eq(userAIHistory.userId, Number(userId)))
				.orderBy(desc(userAIHistory.createdAt))
				.limit(4)
				.then((res) => res.map((r) => r.prompt).join("\n"));
			await redis.set(cacheKey, JSON.stringify([...newCacheData, ...newHistory]), { EX: 60 * 60 * 24 });
		}
		return res.status(200).json({ prompt, aiResult });
	} catch (error) {
		res.status(500).json({ message: "Internal server error" + error });
	}
};
