import { Router } from "express";
import {
  postVideoReplyController,
  updateVideoReplyController,
  deleteVideoReplyController,
  likeVideoReplyController,
  unlikeVideoReplyController,
} from "../../controllers/me/video-replies.controller.js";
import { verifyFirebaseToken } from "@/middleware/auth.js";

const router = Router();

router.post("/:id", verifyFirebaseToken as any, postVideoReplyController as any);
router.put("/:id", verifyFirebaseToken as any, updateVideoReplyController as any);
router.delete("/:id", verifyFirebaseToken as any, deleteVideoReplyController as any);
router.patch("/:id/like", verifyFirebaseToken as any, likeVideoReplyController as any);
router.patch("/:id/unlike", verifyFirebaseToken as any, unlikeVideoReplyController as any);

export default router;
