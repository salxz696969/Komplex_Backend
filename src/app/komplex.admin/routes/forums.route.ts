import { Router } from "express";
import { getAllForums, getForumById, updateForum, deleteForum } from "../controllers/forums.controller.js";
import {
	adminBigDeleteRateLimiter,
	adminBigUpdateRateLimiter,
	adminGetBigContentRateLimiter,
} from "@/middleware/redisLimiter.js";
const router = Router();

// Add your route handlers here
router.get("/", adminGetBigContentRateLimiter, getAllForums as any);
router.get("/:id", adminGetBigContentRateLimiter, getForumById as any);
router.put("/:id", adminBigUpdateRateLimiter, updateForum as any);
router.delete("/:id", adminBigDeleteRateLimiter, deleteForum as any);

export default router;
