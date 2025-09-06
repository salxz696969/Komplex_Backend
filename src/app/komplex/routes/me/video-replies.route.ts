import { Router } from "express";
import {
  postVideoReplyController,
  updateVideoReplyController,
  deleteVideoReplyController,
  likeVideoReplyController,
  unlikeVideoReplyController,
} from "../../controllers/me/video-replies.controller.js";

const router = Router();

router.post("/", postVideoReplyController);
router.put("/:id", updateVideoReplyController);
router.delete("/:id", deleteVideoReplyController);
router.patch("/:id/like", likeVideoReplyController);
router.patch("/:id/unlike", unlikeVideoReplyController);

export default router;
