import { Router } from "express";
import { getUserBlogsController } from "@/app/komplex/controllers/users/blogs.controller.js";
import { getBigContentRateLimiter } from "@/middleware/redisLimiter.js";
import { verifyFirebaseTokenOptional } from "@/middleware/auth.js";

const router = Router();

router.get("/", verifyFirebaseTokenOptional as any, getBigContentRateLimiter, getUserBlogsController as any);

export default router;
