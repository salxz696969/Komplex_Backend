import { Router } from "express";
import { getUserProfileController } from "@/app/komplex/controllers/users/profile.controller.js";
import { getSmallContentRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

router.get("/", getSmallContentRateLimiter, getUserProfileController as any);

export default router;
