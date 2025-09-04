import { Router } from "express";
import {
  getAllRepliesForAComment,
  postForumReply,
  likeForumCommentReply,
  unlikeForumCommentReply,
  updateForumReply,
  deleteForumReply,
} from "../controllers/forum_replies.controller.js";
import { uploadImages } from "../../../middleware/upload.js";
const router = Router();

// Add your route handlers here
router.get("/:id", getAllRepliesForAComment as any);
// <<<<<<< HEAD
// router.post("/:id", upload.any(), postForumReply);
// router.patch("/:id/like", likeForumCommentReply);
// router.patch("/:id/unlike", unlikeForumCommentReply);
// router.patch("/:id", upload.any(), updateForumReply);
// =======
router.post("/:id", uploadImages.array("images", 4), postForumReply as any);
router.post("/:id/like", likeForumCommentReply as any);
router.delete("/:id/unlike", unlikeForumCommentReply as any);
router.patch("/:id", uploadImages.array("images", 4), updateForumReply as any);
// >>>>>>> 141698d11d0c513180ff94ce485f4ca263d16a78
// router.delete("/:id", deleteForumReply);

export default router;
