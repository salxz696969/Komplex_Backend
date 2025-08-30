import { Router } from "express";
import { uploadImages } from "../../middleware/upload";
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
router.post("/:id", uploadImages.array("images", 4), postVideoComment);

// Update a comment (with media)
router.patch("/:id", uploadImages.array("images", 4), updateVideoComment);

// Delete a comment
router.delete("/:id", deleteVideoComment);

// Like a comment
router.post("/:id/like", likeVideoComment);

// Unlike a comment 
router.post("/:id/unlike", unlikeVideoComment);

export default router;
