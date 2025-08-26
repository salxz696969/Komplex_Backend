import { Router } from "express";
import {
	deleteForumComment,
	getAllCommentsForAForum,
	likeForumComment,
	postForumComment,
	unlikeForumComment,
	updateForumComment,
} from "../controllers/forum_comments.controller";
import upload from "../../middleware/upload";
const router = Router();

// Add your route handlers here
router.get("/:id", getAllCommentsForAForum);
router.post("/:id", upload.any(), postForumComment);
router.patch("/:id/like", likeForumComment);
router.patch("/:id/unlike", unlikeForumComment);
router.patch("/:id", upload.any(), updateForumComment);
router.delete("/:id", deleteForumComment);

export default router;
