import { Router } from "express";
import {
	getAllRepliesForAComment,
	postForumReply,
	likeForumCommentReply,
	unlikeForumCommentReply,
	updateForumReply,
	deleteForumReply,
} from "../controllers/forum_replies.controller.js";
import { uploadImages } from "../../middleware/upload.js";
const router = Router();

// Add your route handlers here
router.get("/:id", getAllRepliesForAComment);
router.post("/:id", uploadImages.array("images", 4), postForumReply);
router.post("/:id/like", likeForumCommentReply);
router.delete("/:id/unlike", unlikeForumCommentReply);
router.patch("/:id", uploadImages.array("images", 4), updateForumReply);
router.delete("/:id", deleteForumReply);

export default router;
