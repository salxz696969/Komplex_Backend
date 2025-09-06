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
router.post("/:id", postForumCommentController);
router.put("/:id", updateForumCommentController);
router.delete("/:id", deleteForumCommentController);
router.patch("/:id/like", likeForumCommentController);
router.patch("/:id/unlike", unlikeForumCommentController);

export default router;
