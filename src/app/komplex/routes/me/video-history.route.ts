import { Router } from "express";
import { getMyVideoHistoryController } from "../../controllers/me/videos.controller.js";
import { getVideoRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

router.get("/", getVideoRateLimiter, getMyVideoHistoryController as any); // GET /me/videos/history - my video history

export default router;
