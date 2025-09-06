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

router.get("/", getAllMyVideosController); // GET /me/videos - my videos
router.post("/", postVideoController); // POST /me/videos - create video
router.put("/:id", updateVideoController); // PUT /me/videos/:id - update video
router.delete("/:id", deleteVideoController); // DELETE /me/videos/:id - delete video
router.patch("/:id/like", likeVideoController); // PATCH /me/videos/:id/like - like video
router.patch("/:id/unlike", unlikeVideoController); // PATCH /me/videos/:id/unlike - unlike video
router.patch("/:id/save", saveVideoController); // PATCH /me/videos/:id/save - save video
router.patch("/:id/unsave", unsaveVideoController); // PATCH /me/videos/:id/unsave - unsave video


export default router;
