import { Router } from "express";
import {
  postVideoCommentController,
  deleteVideoCommentController,
  likeVideoCommentController,
  unlikeVideoCommentController,
} from "../../controllers/me/video-comments.controller.js";

const router = Router();

router.post("/", postVideoCommentController as any);
router.delete("/:id", deleteVideoCommentController as any);
router.patch("/:id/like", likeVideoCommentController as any);
router.patch("/:id/unlike", unlikeVideoCommentController as any);

export default router;
