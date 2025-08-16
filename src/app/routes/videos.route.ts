import { Router } from "express";
import {
	deleteVideo,
	getAllVideos,
	getVideoById,
	likeVideo,
	postVideo,
	saveVideo,
	unlikeVideo,
	unsaveVideo,
	updateVideo,
} from "../controllers/videos.controller";
import upload from "../middleware/upload";
const router = Router();

// Add your route handlers here
router.post("/", upload.single("video"), postVideo);
router.get("/", getAllVideos);
router.get("/:id", getVideoById);
router.put("/:id", upload.single("video"), updateVideo);
router.delete("/:id", deleteVideo);
router.post("/:id/like", likeVideo);
router.delete("/:id/unlike", unlikeVideo);
router.post("/:id/save", saveVideo);
router.delete("/:id/unsave", unsaveVideo);

export default router;
