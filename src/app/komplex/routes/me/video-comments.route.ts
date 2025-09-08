import { Router } from "express";
import {
	postVideoCommentController,
	deleteVideoCommentController,
	likeVideoCommentController,
	unlikeVideoCommentController,
} from "../../controllers/me/video-comments.controller.js";
import { deleteBigRateLimiter, postBigRateLimiter, updateSmallRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

router.post("/", postBigRateLimiter, postVideoCommentController as any);
router.delete("/:id", deleteBigRateLimiter, deleteVideoCommentController as any);
router.patch("/:id/like", updateSmallRateLimiter, likeVideoCommentController as any);
router.patch("/:id/unlike", updateSmallRateLimiter, unlikeVideoCommentController as any);

export default router;
