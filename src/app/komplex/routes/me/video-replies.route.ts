import { Router } from "express";
import {
  postVideoReplyController,
  updateVideoReplyController,
  deleteVideoReplyController,
  likeVideoReplyController,
  unlikeVideoReplyController,
} from "../../controllers/me/video-replies.controller.js";
import { verifyFirebaseToken } from "@/middleware/auth.js";
import {
  deleteBigRateLimiter,
  postBigRateLimiter,
  updateBigRateLimiter,
  updateSmallRateLimiter,
} from "@/middleware/redisLimiter.js";

const router = Router();

router.post(
  "/",
  verifyFirebaseToken as any,
  postBigRateLimiter,
  postVideoReplyController as any
);
router.put(
  "/:id",
  verifyFirebaseToken as any,
  updateBigRateLimiter,
  updateVideoReplyController as any
);
router.delete(
  "/:id",
  verifyFirebaseToken as any,
  deleteBigRateLimiter,
  deleteVideoReplyController as any
);
router.patch(
  "/:id/like",
  verifyFirebaseToken as any,
  updateSmallRateLimiter,
  likeVideoReplyController as any
);
router.patch(
  "/:id/unlike",
  verifyFirebaseToken as any,
  updateSmallRateLimiter,
  unlikeVideoReplyController as any
);

export default router;
