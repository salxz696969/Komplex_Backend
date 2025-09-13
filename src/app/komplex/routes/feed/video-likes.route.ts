import { Router } from "express";
import { getVideoLikesController } from "../../controllers/feed/video-likes.controller.js";
import { getSmallContentRateLimiter } from "@/middleware/redisLimiter.js";
import { verifyFirebaseTokenOptional } from "@/middleware/auth.js";

const router = Router();

router.get("/:id", verifyFirebaseTokenOptional as any, getSmallContentRateLimiter, getVideoLikesController as any);

export default router;
