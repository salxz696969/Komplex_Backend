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

const router = Router();

router.get("/", getAllMyVideosController as any); // GET /me/videos - my videos
router.post("/", postVideoController as any); // POST /me/videos - create video
router.put("/:id", updateVideoController as any); // PUT /me/videos/:id - update video
router.delete("/:id", deleteVideoController as any); // DELETE /me/videos/:id - delete video
router.patch("/:id/like", likeVideoController as any); // PATCH /me/videos/:id/like - like video
router.patch("/:id/unlike", unlikeVideoController as any); // PATCH /me/videos/:id/unlike - unlike video
router.patch("/:id/save", saveVideoController as any); // PATCH /me/videos/:id/save - save video
router.patch("/:id/unsave", unsaveVideoController as any); // PATCH /me/videos/:id/unsave - unsave video

export default router;
