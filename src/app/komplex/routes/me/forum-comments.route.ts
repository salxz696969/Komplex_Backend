import { Router } from "express";
import {
	postForumCommentController,
	updateForumCommentController,
	deleteForumCommentController,
	likeForumCommentController,
	unlikeForumCommentController,
} from "../../controllers/me/forum-comments.controller.js";
import {
	deleteBigRateLimiter,
	postBigRateLimiter,
	updateBigRateLimiter,
	updateSmallRateLimiter,
} from "@/middleware/redisLimiter.js";

const router = Router();

// Forum Comments routes
router.post("/:id", postBigRateLimiter, postForumCommentController as any);
router.put("/:id", updateBigRateLimiter, updateForumCommentController as any);
router.delete("/:id", deleteBigRateLimiter, deleteForumCommentController as any);
router.patch("/:id/like", updateSmallRateLimiter, postBigRateLimiter, likeForumCommentController as any);
router.patch("/:id/unlike", updateSmallRateLimiter, postBigRateLimiter, unlikeForumCommentController as any);

export default router;
