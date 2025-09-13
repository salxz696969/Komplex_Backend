import { Router } from "express";
import {
  getAllForumsController,
  getForumByIdController,
  // TODO: Future features - these functions need to be implemented
  // getForumLikes, // GET /forums/:id/likes - who liked this forum
} from "../../controllers/feed/forums.controller.js";
import { verifyFirebaseTokenOptional } from "@/middleware/auth.js";
import { getBigContentRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

router.get(
  "/",
  verifyFirebaseTokenOptional as any,
  getBigContentRateLimiter,
  getAllForumsController as any
);

router.get(
  "/:id",
  verifyFirebaseTokenOptional as any,
  getBigContentRateLimiter,
  getForumByIdController as any
);

// TODO: Future features
// router.get("/:id/likes", getForumLikes); // Who liked this forum

export default router;
