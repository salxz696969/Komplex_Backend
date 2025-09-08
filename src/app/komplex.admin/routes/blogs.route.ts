import { Router } from "express";
import {
  postBlog,
  getAllBlogs,
  getSavedBlogs,
} from "../controllers/blogs.controller.js";
import { adminGetSmallContentRateLimiter, adminSmallDeleteRateLimiter, adminSmallPostRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

// Add your route handlers here
router.get("/", adminGetSmallContentRateLimiter, getAllBlogs as any);
router.post("/", adminSmallPostRateLimiter, postBlog as any);
router.get("/:id/saved", adminGetSmallContentRateLimiter, getSavedBlogs as any);

export default router;
