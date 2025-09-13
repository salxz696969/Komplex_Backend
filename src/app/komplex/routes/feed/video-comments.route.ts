import { Router } from "express";
import { getVideoCommentsController } from "../../controllers/feed/video-comments.controller.js";
import { verifyFirebaseTokenOptional } from "@/middleware/auth.js";
import { getBigContentRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

router.get("/:id", verifyFirebaseTokenOptional as any, getBigContentRateLimiter, getVideoCommentsController as any);

export default router;
