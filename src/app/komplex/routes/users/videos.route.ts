import { Router } from "express";
import { getUserVideosController } from "@/app/komplex/controllers/users/videos.controller.js";
import { getVideoRateLimiter } from "@/middleware/redisLimiter.js";
import { verifyFirebaseTokenOptional } from "@/middleware/auth.js";

const router = Router();

router.get("/", verifyFirebaseTokenOptional as any, getVideoRateLimiter, getUserVideosController as any);

export default router;
