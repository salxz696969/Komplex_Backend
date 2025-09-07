import { Router } from "express";
import {
  getAllVideosController,
  getVideoByIdController,
  // TODO: Future features - these functions need to be implemented
  // getVideoComments,
  // getVideoReplies,
  // getVideoLikes, // GET /videos/:id/likes - who liked this video
} from "../../controllers/feed/videos.controller.js";
import { verifyFirebaseToken } from "@/middleware/auth.js";

const router = Router();

router.get("/", verifyFirebaseToken as any, getAllVideosController as any); // GET /feed/videos - curated video feed

router.get("/:id", verifyFirebaseToken as any, getVideoByIdController as any); // GET /feed/videos/:id - specific video details

export default router;
