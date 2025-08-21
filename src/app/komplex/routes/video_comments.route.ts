import { Router } from "express";
import upload from "../../middleware/upload";
import {
	getAllVideoCommentsForAVideo,
	postVideoComment,
	updateVideoComment,
	deleteVideoComment,
	likeVideoComment,
	unlikeVideoComment,
} from "../controllers/video_comments.controller";

const router = Router();

// Get all comments for a video
router.get("/:id", getAllVideoCommentsForAVideo);

// Post a new comment (with media)
router.post("/:id", upload.any(), postVideoComment);

// Update a comment (with media)
router.patch("/:id", upload.any(), updateVideoComment);

// Delete a comment
router.delete("/:id", deleteVideoComment);

// Like a comment
router.post("/:id/like", likeVideoComment);

// Unlike a comment
router.post("/:id/unlike", unlikeVideoComment);

export default router;
