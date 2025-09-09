import { Router } from "express";
import { createFeedbackController } from "../../controllers/me/feedback.controller.js"; // ! TO CHANGE
import { postSmallRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

router.post("/", postSmallRateLimiter, createFeedbackController as any);

export default router;
