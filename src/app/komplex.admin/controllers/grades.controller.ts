import { db } from "../../../db/index.js";
import { redis } from "../../../db/redis/redisConfig.js";
import { exercises } from "../../../db/schema.js";

import { Request, Response } from "express";

export const getGrades = async (req: Request, res: Response) => {
	try {
		const cacheKey = `allGrades`;
		const cacheData = await redis.get(cacheKey);
		if (cacheData) {
			return res.status(200).json(JSON.parse(cacheData));
		}
		const result = await db
			.select({
				grade: exercises.grade,
			})
			.from(exercises);
		const grades = [...new Set(result.map((item) => item.grade))];
		await redis.set(cacheKey, JSON.stringify(grades), { EX: 60 * 60 * 24 });
		res.status(200).json(grades);
	} catch (error) {
		res.status(500).json({ message: "Internal server error" + error });
	}
};
