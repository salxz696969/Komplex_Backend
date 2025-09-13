import {  verifyFirebaseTokenOptional } from "@/middleware/auth.js";
import { Router } from "express";
import {
  getAllBlogsController,
  getBlogByIdController,
  // TODO: Future features
  // getBlogLikes, // GET /blogs/:id/likes - who liked this blog
  // getBlogComments, // GET /blogs/:id/comments - comments on this blog
} from "@/app/komplex/controllers/feed/blogs.controller.js";
import { getSmallContentRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

router.get(
  "/",
  verifyFirebaseTokenOptional as any,
  getSmallContentRateLimiter,
  getAllBlogsController as any
);

router.get(
  "/:id",
  verifyFirebaseTokenOptional as any,
  getSmallContentRateLimiter,
  getBlogByIdController as any
);

export default router;
