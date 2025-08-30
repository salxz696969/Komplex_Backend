import { Router } from "express";
import { uploadImages } from "../../../middleware/upload";
import {
  getAllVideoRepliesForAComment,
  postForumVideoReply,
  updateForumVideoReply,
  deleteForumVideoReply,
  likeForumVideoReply,
  unlikeForumVideoReply,
} from "../controllers/video_replies.controller";

const router = Router();

// Get all replies for a video comment
router.get("/:id", getAllVideoRepliesForAComment as any);

// Post a reply to a video comment (with media)
router.post("/:id", uploadImages.array("images", 4), postForumVideoReply as any);

// Update a reply (with media)
router.patch("/:id", uploadImages.array("images", 4), updateForumVideoReply as any);

// Delete a reply
router.delete("/:id", deleteForumVideoReply as any);

// Like a reply
router.post("/:id/like", likeForumVideoReply as any);

// Unlike a reply
router.post("/:id/unlike", unlikeForumVideoReply as any);

export default router;
