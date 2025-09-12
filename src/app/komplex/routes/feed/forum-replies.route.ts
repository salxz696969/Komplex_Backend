import { Router } from "express";
import { getForumCommentsRepliesController } from "../../controllers/feed/forum-replies.controller.js";
import { getBigContentRateLimiter } from "@/middleware/redisLimiter.js";
import { verifyFirebaseToken } from "@/middleware/auth.js";

const router = Router();

router.get("/:id", verifyFirebaseToken as any, getBigContentRateLimiter, getForumCommentsRepliesController as any);

export default router;
