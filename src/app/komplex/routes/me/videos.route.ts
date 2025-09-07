import { Router } from "express";
import { uploadImages } from "../../../../middleware/upload.js";
import {
  getAllMyVideosController,
  postVideoController,
  updateVideoController,
  deleteVideoController,
  likeVideoController,
  unlikeVideoController,
  saveVideoController,
  unsaveVideoController,
  getMyVideoHistoryController,
} from "../../controllers/me/videos.controller.js";
import { verifyFirebaseToken } from "@/middleware/auth.js";

const router = Router();

router.get("/", verifyFirebaseToken as any, getAllMyVideosController as any); // GET /me/videos - my videos
router.post("/", verifyFirebaseToken as any, postVideoController as any); // POST /me/videos - create video
router.put("/:id", verifyFirebaseToken as any, updateVideoController as any); // PUT /me/videos/:id - update video
router.delete("/:id", verifyFirebaseToken as any, deleteVideoController as any); // DELETE /me/videos/:id - delete video
router.patch(
  "/:id/like",
  verifyFirebaseToken as any,
  likeVideoController as any
); // PATCH /me/videos/:id/like - like video
router.patch(
  "/:id/unlike",
  verifyFirebaseToken as any,
  unlikeVideoController as any
); // PATCH /me/videos/:id/unlike - unlike video
router.patch(
  "/:id/save",
  verifyFirebaseToken as any,
  saveVideoController as any
); // PATCH /me/videos/:id/save - save video
router.patch(
  "/:id/unsave",
  verifyFirebaseToken as any,
  unsaveVideoController as any
); // PATCH /me/videos/:id/unsave - unsave video

export default router;
