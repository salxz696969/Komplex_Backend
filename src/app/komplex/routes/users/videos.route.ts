import { Router } from "express";
import { getUserVideosController } from "@/app/komplex/controllers/users/videos.controller.js";
import { getVideoRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

router.get("/", getVideoRateLimiter, getUserVideosController as any);

export default router;
