import { Router } from "express";
import { verifyFirebaseToken } from "./../../../../middleware/auth.js";
import {
  postVideoCommentController,
  deleteVideoCommentController,
  likeVideoCommentController,
  unlikeVideoCommentController,
} from "../../controllers/me/video-comments.controller.js";
import {
  deleteBigRateLimiter,
  postBigRateLimiter,
  updateSmallRateLimiter,
} from "@/middleware/redisLimiter.js";

const router = Router();

router.post(
  "/",
  verifyFirebaseToken as any,
  postBigRateLimiter,
  postVideoCommentController as any
);
router.delete(
  "/:id",
  verifyFirebaseToken as any,
  deleteBigRateLimiter,
  deleteVideoCommentController as any
);
router.patch(
  "/:id/like",
  verifyFirebaseToken as any,
  updateSmallRateLimiter,
  likeVideoCommentController as any
);
router.patch(
  "/:id/unlike",
  verifyFirebaseToken as any,
  updateSmallRateLimiter,
  unlikeVideoCommentController as any
);

export default router;
