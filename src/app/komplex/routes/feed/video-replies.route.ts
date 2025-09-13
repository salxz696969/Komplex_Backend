import { Router } from "express";
import { getAllVideoRepliesForACommentController } from "../../controllers/feed/video-replies.controller.js";
import { getBigContentRateLimiter } from "@/middleware/redisLimiter.js";
import { verifyFirebaseTokenOptional } from "@/middleware/auth.js";

const router = Router();

router.get("/:id", verifyFirebaseTokenOptional as any, getBigContentRateLimiter, getAllVideoRepliesForACommentController as any);

export default router;
