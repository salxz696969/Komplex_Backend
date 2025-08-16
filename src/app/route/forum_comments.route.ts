import { Router } from "express";
import {
	deleteForumComment,
	getAllCommentsForAForum,
	likeForumComment,
	postForumComment,
	unlikeForumComment,
	updateForumComment,
} from "../controller/forum_comments.controller";
import upload from "../middleware/upload";
const router = Router();

// Add your route handlers here
router.get("/:id", getAllCommentsForAForum);
router.post("/:id", upload.any(), postForumComment);
router.post("/:id/like", likeForumComment);
router.delete("/:id/unlike", unlikeForumComment);
router.patch("/:id", upload.any(), updateForumComment);
router.delete("/:id", deleteForumComment);

export default router;
