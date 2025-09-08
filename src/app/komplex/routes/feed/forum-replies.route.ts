import { Router } from "express";
import { getForumCommentsRepliesController } from "../../controllers/feed/forum-replies.controller.js";
import { getBigContentRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

router.get("/:id", getBigContentRateLimiter, getForumCommentsRepliesController as any);

export default router;
