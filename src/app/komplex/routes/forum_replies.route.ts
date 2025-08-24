import { Router } from "express";
import {
	getAllRepliesForAComment,
	postForumReply,
	likeForumCommentReply,
	unlikeForumCommentReply,
	updateForumReply,
	deleteForumReply,
} from "../controllers/forum_replies.controller";
import upload from "../../middleware/upload";
const router = Router();

// Add your route handlers here
router.get("/:id", getAllRepliesForAComment);
router.post("/:id", upload.any(), postForumReply);
router.patch("/:id/like", likeForumCommentReply);
router.patch("/:id/unlike", unlikeForumCommentReply);
router.patch("/:id", upload.any(), updateForumReply);
router.delete("/:id", deleteForumReply);

export default router;
