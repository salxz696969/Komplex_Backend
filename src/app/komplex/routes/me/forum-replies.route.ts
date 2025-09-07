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
router.post("/:id", postForumReplyController as any);
router.put("/:id", updateForumReplyController as any);
router.delete("/:id", deleteForumReplyController as any);
router.patch("/:id/like", likeForumReplyController as any);
router.patch("/:id/unlike", unlikeForumReplyController as any);

export default router;
