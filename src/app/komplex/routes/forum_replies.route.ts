import { Router } from "express";
import {
	getAllRepliesForAComment,
	postForumReply,
	likeForumCommentReply,
	unlikeForumCommentReply,
	updateForumReply,
	deleteForumReply,
} from "../controllers/forum_replies.controller";
import { uploadImages } from "../../middleware/upload";
const router = Router();

// Add your route handlers here
router.get("/:id", getAllRepliesForAComment);
// <<<<<<< HEAD
// router.post("/:id", upload.any(), postForumReply);
// router.patch("/:id/like", likeForumCommentReply);
// router.patch("/:id/unlike", unlikeForumCommentReply);
// router.patch("/:id", upload.any(), updateForumReply);
// =======
router.post("/:id", uploadImages.array("images", 4), postForumReply);
router.post("/:id/like", likeForumCommentReply);
router.delete("/:id/unlike", unlikeForumCommentReply);
router.patch("/:id", uploadImages.array("images", 4), updateForumReply);
// >>>>>>> 141698d11d0c513180ff94ce485f4ca263d16a78
// router.delete("/:id", deleteForumReply);

export default router;
