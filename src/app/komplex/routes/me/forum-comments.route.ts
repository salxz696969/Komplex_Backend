import { Router } from "express";
import {
  postForumCommentController,
  updateForumCommentController,
  deleteForumCommentController,
  likeForumCommentController,
  unlikeForumCommentController,
} from "../../controllers/me/forum-comments.controller.js";
import { verifyFirebaseToken } from "@/middleware/auth.js";
import {
  deleteBigRateLimiter,
  postBigRateLimiter,
  updateBigRateLimiter,
  updateSmallRateLimiter,
} from "@/middleware/redisLimiter.js";

const router = Router();

router.post(
  "/:id",
  verifyFirebaseToken as any,
  postBigRateLimiter,
  postForumCommentController as any
);
router.put(
  "/:id",
  verifyFirebaseToken as any,
  updateBigRateLimiter,
  updateForumCommentController as any
);
router.delete(
  "/:id",
  verifyFirebaseToken as any,
  deleteBigRateLimiter,
  deleteForumCommentController as any
);
router.patch(
  "/:id/like",
  verifyFirebaseToken as any,
  updateSmallRateLimiter,
  postBigRateLimiter,
  likeForumCommentController as any
);
router.patch(
  "/:id/unlike",
  verifyFirebaseToken as any,
  updateSmallRateLimiter,
  postBigRateLimiter,
  unlikeForumCommentController as any
);

export default router;
