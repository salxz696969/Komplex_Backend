import { AuthenticatedRequest } from "../../../types/request.js";
import { Response } from "express";
import { db } from "../../../db/index.js";
import { users } from "../../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { redis } from "@/db/redis/redisConfig.js";

export const handleLogin = async (req: AuthenticatedRequest, res: Response) => {
  const { uid } = req.body;
  const cacheKey = `users:${uid}`;
  if (!uid) {
    return res.status(400).json({ message: "UID is required" });
  }
  const cacheData = await redis.get(cacheKey);
  const parsedCache = cacheData ? JSON.parse(cacheData) : null;
  if (parsedCache) {
    return res.status(200).json(parsedCache);
  }
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.uid, uid), eq(users.isAdmin, true)));
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  res.status(200).json(user);
};
