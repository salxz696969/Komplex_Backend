import { Router } from "express";
import { uploadImages } from "../../middleware/upload.js";
import {
	getAllVideoRepliesForAComment,
	postForumVideoReply,
	updateForumVideoReply,
	deleteForumVideoReply,
	likeForumVideoReply,
	unlikeForumVideoReply,
} from "../controllers/video_replies.controller.js";

const router = Router();

// Get all replies for a video comment
router.get("/:id", getAllVideoRepliesForAComment);

// Post a reply to a video comment (with media)
router.post("/:id", uploadImages.array("images", 4), postForumVideoReply);

// Update a reply (with media)
router.patch("/:id", uploadImages.array("images", 4), updateForumVideoReply);

// Delete a reply
router.delete("/:id", deleteForumVideoReply);

// Like a reply
router.post("/:id/like", likeForumVideoReply);

// Unlike a reply
router.post("/:id/unlike", unlikeForumVideoReply);

export default router;
