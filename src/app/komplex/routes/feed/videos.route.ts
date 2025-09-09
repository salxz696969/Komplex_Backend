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
import { getVideoRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

router.get(
  "/",
  verifyFirebaseToken as any,
  getVideoRateLimiter,
  getAllVideosController as any
); // GET /feed/videos - curated video feed

router.get(
  "/:id",
  verifyFirebaseToken as any,
  getVideoRateLimiter,
  getVideoByIdController as any
); // GET /feed/videos/:id - specific video details

export default router;
