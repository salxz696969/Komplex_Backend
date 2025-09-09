import { Router } from "express";
import { getMyVideoHistoryController } from "../../controllers/me/videos.controller.js";
import { getVideoRateLimiter } from "@/middleware/redisLimiter.js";
import { verifyFirebaseToken } from "@/middleware/auth.js";

const router = Router();

router.get("/", verifyFirebaseToken as any, getVideoRateLimiter, getMyVideoHistoryController as any); // GET /me/videos/history - my video history

export default router;
