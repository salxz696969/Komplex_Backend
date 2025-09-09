import { Router } from "express";
import { verifyFirebaseToken } from "./../../../../middleware/auth.js";
import {
  postVideoCommentController,
  deleteVideoCommentController,
  likeVideoCommentController,
  unlikeVideoCommentController,
} from "../../controllers/me/video-comments.controller.js";

const router = Router();

router.post(
  "/:id",
  verifyFirebaseToken as any,
  postVideoCommentController as any
);
router.delete(
  "/:id",
  verifyFirebaseToken as any,
  deleteVideoCommentController as any
);
router.patch(
  "/:id/like",
  verifyFirebaseToken as any,
  likeVideoCommentController as any
);
router.patch(
  "/:id/unlike",
  verifyFirebaseToken as any,
  unlikeVideoCommentController as any
);

export default router;
