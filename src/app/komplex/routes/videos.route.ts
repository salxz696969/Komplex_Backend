import { Router } from "express";
import {
	deleteVideo,
	getAllVideos,
	getVideoById,
	likeVideo,
	postVideoPresigned,
	saveVideo,
	unlikeVideo,
	unsaveVideo,
	getVideoExercise,
	updateVideoPresignedUrl,
	updateVideoExercise,
} from "../controllers/videos.controller.js";
// import { uploadVideoAndThumbnail } from "../../../middleware/upload.";
const router = Router();

// Add your route handlers here
router.get("/", getAllVideos as any);
router.get("/:id", getVideoById as any);
// router.post("/", uploadVideoAndThumbnail, postVideo);
router.post("/", postVideoPresigned as any);
// router.patch("/", uploadVideoAndThumbnail, updateVideo as any);
router.delete("/:id", deleteVideo as any);
router.put("/:id", updateVideoPresignedUrl as any);
router.patch("/:id/like", likeVideo as any);
router.patch("/:id/unlike", unlikeVideo as any);
router.patch("/:id/save", saveVideo as any);
router.patch("/:id/unsave", unsaveVideo as any);
router.get("/:id/exercise", getVideoExercise as any);
router.put("/:id/exercise", updateVideoExercise as any);

export default router;
