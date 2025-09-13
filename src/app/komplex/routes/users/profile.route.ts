import { Router } from "express";
import { getUserProfileController } from "@/app/komplex/controllers/users/profile.controller.js";
import { getSmallContentRateLimiter } from "@/middleware/redisLimiter.js";
import { verifyFirebaseTokenOptional } from "@/middleware/auth.js";

const router = Router();

router.get("/", verifyFirebaseTokenOptional as any, getSmallContentRateLimiter, getUserProfileController as any);

export default router;
