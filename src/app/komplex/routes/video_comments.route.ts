import { Router } from "express";
import { uploadImages } from "../../../middleware/upload";
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
router.get("/:id", getAllVideoCommentsForAVideo as any);

// Post a new comment (with media)
router.post("/:id", uploadImages.array("images", 4), postVideoComment as any);

// Update a comment (with media)
router.patch("/:id", uploadImages.array("images", 4), updateVideoComment as any);

// Delete a comment
router.delete("/:id", deleteVideoComment as any);

// Like a comment
router.post("/:id/like", likeVideoComment as any);

// Unlike a comment
router.post("/:id/unlike", unlikeVideoComment as any);

export default router;
