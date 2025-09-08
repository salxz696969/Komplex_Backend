import { Router } from "express";
import {
  postForumReplyController,
  updateForumReplyController,
  deleteForumReplyController,
  likeForumReplyController,
  unlikeForumReplyController,
} from "../../controllers/me/forum-replies.controller.js";
import { verifyFirebaseToken } from "@/middleware/auth.js";

const router = Router();

// Forum Replies routes
router.post("/:id", verifyFirebaseToken as any, postForumReplyController as any);
router.put("/:id", verifyFirebaseToken as any, updateForumReplyController as any);
router.delete("/:id", verifyFirebaseToken as any, deleteForumReplyController as any);
router.patch("/:id/like", verifyFirebaseToken as any, likeForumReplyController as any);
router.patch("/:id/unlike", verifyFirebaseToken as any, unlikeForumReplyController as any);

export default router;
