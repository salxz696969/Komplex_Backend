import { Router } from "express";
import { getUserForumsController } from "@/app/komplex/controllers/users/forums.controller.js";
import { getBigContentRateLimiter } from "@/middleware/redisLimiter.js";
import { verifyFirebaseTokenOptional } from "@/middleware/auth.js";

const router = Router();

router.get("/", verifyFirebaseTokenOptional as any, getBigContentRateLimiter, getUserForumsController as any);

export default router;
