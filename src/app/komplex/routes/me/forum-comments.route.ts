import { Router } from "express";
import {
  postForumCommentController,
  updateForumCommentController,
  deleteForumCommentController,
  likeForumCommentController,
  unlikeForumCommentController,
} from "../../controllers/me/forum-comments.controller.js";

const router = Router();

// Forum Comments routes
router.post("/:id", postForumCommentController as any);
router.put("/:id", updateForumCommentController as any);
router.delete("/:id", deleteForumCommentController as any);
router.patch("/:id/like", likeForumCommentController as any);
router.patch("/:id/unlike", unlikeForumCommentController as any);

export default router;
