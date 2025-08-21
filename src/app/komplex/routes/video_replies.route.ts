import { Router } from "express";
import upload from "../../middleware/upload";
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
router.get("/:id", getAllVideoRepliesForAComment);

// Post a reply to a video comment (with media)
router.post("/:id", upload.any(), postForumVideoReply);

// Update a reply (with media)
router.patch("/:id", upload.any(), updateForumVideoReply);

// Delete a reply
router.delete("/:id", deleteForumVideoReply);

// Like a reply
router.post("/:id/like", likeForumVideoReply);

// Unlike a reply
router.post("/:id/unlike", unlikeForumVideoReply);

export default router;
