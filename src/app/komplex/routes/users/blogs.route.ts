import { Router } from "express";
import { getUserBlogsController } from "@/app/komplex/controllers/users/blogs.controller.js";
import { getBigContentRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

router.get("/", getBigContentRateLimiter, getUserBlogsController as any);

export default router;
