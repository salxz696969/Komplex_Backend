import { Router } from "express";
import { getVideoCommentsController } from "../../controllers/feed/video-comments.controller.js";
import { getBigContentRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

router.get("/:id", getBigContentRateLimiter, getVideoCommentsController as any);

export default router;
