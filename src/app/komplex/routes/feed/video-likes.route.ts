import { Router } from "express";
import { getVideoLikesController } from "../../controllers/feed/video-likes.controller.js";
import { getSmallContentRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

router.get("/:id", getSmallContentRateLimiter, getVideoLikesController as any);

export default router;
