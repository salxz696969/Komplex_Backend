import { verifyFirebaseToken } from '@/middleware/auth.js';
import { Router } from "express";
import { getAllCommentsForAForumController } from "../../controllers/feed/forum-comments.controller.js";
import { getBigContentRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

router.get("/:id", verifyFirebaseToken as any, getBigContentRateLimiter, getAllCommentsForAForumController as any);

export default router;