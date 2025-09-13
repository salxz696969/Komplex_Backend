import { Router } from "express";
import {
  getAllVideosController,
  getRecommendedVideosController,
  getVideoByIdController,
  // TODO: Future features - these functions need to be implemented
  // getVideoComments,
  // getVideoReplies,
  // getVideoLikes, // GET /videos/:id/likes - who liked this video
} from "../../controllers/feed/videos.controller.js";
import { verifyFirebaseTokenOptional } from "@/middleware/auth.js";
import { getVideoRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

router.get(
  "/",
  verifyFirebaseTokenOptional as any,
  getVideoRateLimiter,
  getAllVideosController as any
); // GET /feed/videos - curated video feed

router.get(
  "/:id",
  verifyFirebaseTokenOptional as any,
  getVideoRateLimiter,
  getVideoByIdController as any
); // GET /feed/videos/:id - specific video details

router.get(
  "/:id/recommended",
  verifyFirebaseTokenOptional as any,
  getVideoRateLimiter,
  getRecommendedVideosController as any
); // GET /feed/videos/:id/recommended - recommended videos based on this video

export default router;
