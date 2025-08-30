import { Router } from "express";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  likeVideo,
  postVideo,
  postVideoPresigned,
  saveVideo,
  unlikeVideo,
  unsaveVideo,
  updateVideo,
} from "../controllers/videos.controller";
import { uploadVideoAndThumbnail } from "../../middleware/upload";
const router = Router();

// Add your route handlers here
router.get("/", getAllVideos);
router.get("/:id", getVideoById);
// router.post("/", uploadVideoAndThumbnail, postVideo);
router.post("/", postVideoPresigned);
router.patch("/", uploadVideoAndThumbnail, updateVideo);
router.delete("/:id", deleteVideo);
router.patch("/:id/like", likeVideo);
router.patch("/:id/unlike", unlikeVideo);
router.patch("/:id/save", saveVideo);
router.patch("/:id/unsave", unsaveVideo);

export default router;
