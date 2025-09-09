import { Router } from "express";
import {
  postForumReplyController,
  updateForumReplyController,
  deleteForumReplyController,
  likeForumReplyController,
  unlikeForumReplyController,
} from "../../controllers/me/forum-replies.controller.js";
import { verifyFirebaseToken } from "@/middleware/auth.js";
import {
  deleteBigRateLimiter,
  updateBigRateLimiter,
  deleteSmallRateLimiter,
} from "@/middleware/redisLimiter.js";

const router = Router();

// Forum Replies routes
router.post(
  "/:id",
  verifyFirebaseToken as any,
  updateBigRateLimiter,
  postForumReplyController as any
);
router.put(
  "/:id",
  verifyFirebaseToken as any,
  updateBigRateLimiter,
  updateForumReplyController as any
);
router.delete(
  "/:id",
  verifyFirebaseToken as any,
  deleteBigRateLimiter,
  deleteForumReplyController as any
);
router.patch(
  "/:id/like",
  verifyFirebaseToken as any,
  deleteSmallRateLimiter,
  likeForumReplyController as any
);
router.patch(
  "/:id/unlike",
  verifyFirebaseToken as any,
  deleteSmallRateLimiter,
  unlikeForumReplyController as any
);

export default router;
