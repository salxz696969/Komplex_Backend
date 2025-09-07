import { db } from "../../../../db/index.js";
import { users } from "../../../../db/schema.js";
import { eq } from "drizzle-orm";
import { redis } from "../../../../db/redis/redisConfig.js"; 
import { AuthenticatedRequest } from "../../../../types/request.js";
import { Response } from "express";

export const getCurrentUser = async (req: AuthenticatedRequest, res: Response) => {
	const userId = req.user?.userId;
	if (!userId) {
		return res.status(401).json({ message: "Missing user ID" });
	}
	try {
		console.log("userId", userId);
		const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
		console.log("user", user);
		if (!user[0]) {
			return res.status(401).json({ message: "User not found" });
		}
    const cacheKey = `users:${user[0].id}`;
    await redis.set(cacheKey, JSON.stringify(user[0]), { EX: 60 * 60 * 24 });
		return res.status(200).json(user[0]);
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: "Internal server error" });
	}
};
