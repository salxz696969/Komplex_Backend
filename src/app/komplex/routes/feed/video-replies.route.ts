import { Router } from "express";
import { getAllVideoRepliesForACommentController } from "../../controllers/feed/video-replies.controller.js";
import { getBigContentRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

router.get("/:id", getBigContentRateLimiter, getAllVideoRepliesForACommentController as any);

export default router;
