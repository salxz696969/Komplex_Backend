import { Router } from "express";
import {
	getAllRepliesForAComment,
	postForumReply,
	likeForumCommentReply,
	unlikeForumCommentReply,
	updateForumReply,
	deleteForumReply,
} from "../controllers/forum_replies.controller.js";
import { uploadImages } from "../../../middleware/upload.js";
import {
	adminBigPostRateLimiter,
	adminBigUpdateRateLimiter,
	adminSmallDeleteRateLimiter,
	adminSmallPostRateLimiter,
} from "@/middleware/redisLimiter.js";
const router = Router();

// Add your route handlers here
router.get("/:id", getAllRepliesForAComment as any);

router.post("/:id", uploadImages.array("images", 4), adminBigPostRateLimiter, postForumReply as any);
router.post("/:id/like", adminSmallPostRateLimiter, likeForumCommentReply as any);
router.delete("/:id/unlike", adminSmallDeleteRateLimiter, unlikeForumCommentReply as any);
router.patch("/:id", uploadImages.array("images", 4), adminBigUpdateRateLimiter, updateForumReply as any);
// router.delete("/:id", deleteForumReply);

export default router;
