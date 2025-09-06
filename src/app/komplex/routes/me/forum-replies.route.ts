import { Router } from "express";
import {
  postForumReplyController,
  updateForumReplyController,
  deleteForumReplyController,
  likeForumReplyController,
  unlikeForumReplyController,
} from "../../controllers/me/forum-replies.controller.js";

const router = Router();

// Forum Replies routes
router.post("/:id", postForumReplyController);
router.put("/:id", updateForumReplyController);
router.delete("/:id", deleteForumReplyController);
router.patch("/:id/like", likeForumReplyController);
router.patch("/:id/unlike", unlikeForumReplyController);

export default router;
