import { Router } from "express";
import { getFeedbacks, updateFeedbackStatus } from "../controllers/feedbacks.controller.js";
import { adminGetSmallContentRateLimiter, adminSmallUpdateRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

router.get("/", adminGetSmallContentRateLimiter, getFeedbacks);
router.patch("/:id", adminSmallUpdateRateLimiter, updateFeedbackStatus);
export default router;
