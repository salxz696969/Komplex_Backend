import { Router } from "express";
import {
  postVideoReplyController,
  updateVideoReplyController,
  deleteVideoReplyController,
  likeVideoReplyController,
  unlikeVideoReplyController,
} from "../../controllers/me/video-replies.controller.js";
import { deleteBigRateLimiter, postBigRateLimiter, updateBigRateLimiter, updateSmallRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

router.post("/", postBigRateLimiter, postVideoReplyController as any);
router.put("/:id", updateBigRateLimiter, updateVideoReplyController as any);
router.delete("/:id", deleteBigRateLimiter, deleteVideoReplyController as any);
router.patch("/:id/like", updateSmallRateLimiter, likeVideoReplyController as any);
router.patch("/:id/unlike", updateSmallRateLimiter, unlikeVideoReplyController as any);

export default router;
