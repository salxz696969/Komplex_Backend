import { Router } from "express";
import {
  postVideoCommentController,
  deleteVideoCommentController,
  likeVideoCommentController,
  unlikeVideoCommentController,
} from "../../controllers/me/video-comments.controller.js";

const router = Router();

router.post("/", postVideoCommentController);
router.delete("/:id", deleteVideoCommentController);
router.patch("/:id/like", likeVideoCommentController);
router.patch("/:id/unlike", unlikeVideoCommentController);

export default router;
