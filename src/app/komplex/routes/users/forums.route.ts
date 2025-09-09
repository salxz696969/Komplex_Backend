import { Router } from "express";
import { getUserForumsController } from "@/app/komplex/controllers/users/forums.controller.js";
import { getBigContentRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

router.get("/", getBigContentRateLimiter, getUserForumsController as any);

export default router;
