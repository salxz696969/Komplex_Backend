import { Router } from "express";
import { getDashboardData } from "../controllers/dashboard.controller.js";
import { adminGetBigContentRateLimiter } from "@/middleware/redisLimiter.js";
const router = Router();

router.get("/", adminGetBigContentRateLimiter, getDashboardData);

export default router;