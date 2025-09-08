import { Router } from "express";
import {
	postForumReplyController,
	updateForumReplyController,
	deleteForumReplyController,
	likeForumReplyController,
	unlikeForumReplyController,
} from "../../controllers/me/forum-replies.controller.js";
import { deleteBigRateLimiter, updateBigRateLimiter, deleteSmallRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

// Forum Replies routes
router.post("/:id", updateBigRateLimiter, postForumReplyController as any);
router.put("/:id", updateBigRateLimiter, updateForumReplyController as any);
router.delete("/:id", deleteBigRateLimiter, deleteForumReplyController as any);
router.patch("/:id/like", deleteSmallRateLimiter, likeForumReplyController as any);
router.patch("/:id/unlike", deleteSmallRateLimiter, unlikeForumReplyController as any);

export default router;
