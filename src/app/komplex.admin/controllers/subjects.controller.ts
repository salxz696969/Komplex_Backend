import { db } from "../../../db/index.js";
import { redis } from "../../../db/redis/redisConfig.js";
import { exercises } from "../../../db/schema.js";

import { Request, Response } from "express";

export const getSubjects = async (req: Request, res: Response) => {
	try {
		const cacheKey = `allSubjects`;
		const cacheData = await redis.get(cacheKey);
		if (cacheData) {
			return res.status(200).json(JSON.parse(cacheData));
		}
		const result = await db
			.select({
				subject: exercises.subject,
			})
			.from(exercises);
		const subjects = [...new Set(result.map((item) => item.subject))];
		await redis.set(cacheKey, JSON.stringify(subjects), { EX: 60 * 60 * 24 });
		res.status(200).json(subjects);
	} catch (error) {
		res.status(500).json({ message: "Internal server error" + error });
	}
};
