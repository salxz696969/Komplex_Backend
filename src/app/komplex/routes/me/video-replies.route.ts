import { Router } from "express";
import {
  postVideoReplyController,
  updateVideoReplyController,
  deleteVideoReplyController,
  likeVideoReplyController,
  unlikeVideoReplyController,
} from "../../controllers/me/video-replies.controller.js";

const router = Router();

router.post("/", postVideoReplyController as any);
router.put("/:id", updateVideoReplyController as any);
router.delete("/:id", deleteVideoReplyController as any);
router.patch("/:id/like", likeVideoReplyController as any);
router.patch("/:id/unlike", unlikeVideoReplyController as any);

export default router;
