import { Router } from "express";
import {
  postForumCommentController,
  updateForumCommentController,
  deleteForumCommentController,
  likeForumCommentController,
  unlikeForumCommentController,
} from "../../controllers/me/forum-comments.controller.js";
import { verifyFirebaseToken } from "@/middleware/auth.js";

const router = Router();

// Forum Comments routes
router.post(
  "/:id",
  verifyFirebaseToken as any,
  postForumCommentController as any
);
router.put(
  "/:id",
  verifyFirebaseToken as any,
  updateForumCommentController as any
);
router.delete(
  "/:id",
  verifyFirebaseToken as any,
  deleteForumCommentController as any
);
router.patch(
  "/:id/like",
  verifyFirebaseToken as any,
  likeForumCommentController as any
);
router.patch(
  "/:id/unlike",
  verifyFirebaseToken as any,
  unlikeForumCommentController as any
);

export default router;
