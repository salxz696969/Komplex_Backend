import { Router } from "express";
import {
	deleteForumComment,
	getAllCommentsForAForum,
	likeForumComment,
	postForumComment,
	unlikeForumComment,
	updateForumComment,
} from "../controllers/forum_comments.controller.js";
import { uploadImages } from "../../middleware/upload.js";
const router = Router();

// Add your route handlers here
router.get("/:id", getAllCommentsForAForum);
router.post("/:id", uploadImages.array("images", 4), postForumComment);
router.post("/:id/like", likeForumComment);
router.delete("/:id/unlike", unlikeForumComment);
router.patch("/:id", uploadImages.array("images", 4), updateForumComment);
router.delete("/:id", deleteForumComment);

export default router;
