import { Router } from "express";
import { getAllVideos, getVideoById } from "../controllers/videos.controller.js";
import { adminGetVideoRateLimiter } from "@/middleware/redisLimiter.js";
const router = Router();

// Add your route handlers here
router.get("/", adminGetVideoRateLimiter, getAllVideos);
router.get("/:id", adminGetVideoRateLimiter, getVideoById);

export default router;
