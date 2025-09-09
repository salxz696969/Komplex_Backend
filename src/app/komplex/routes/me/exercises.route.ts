import { Router } from "express";
import {
	getExerciseHistoryController,
	getExerciseDashboardController,
	getExerciseByIdController,
	submitExerciseController,
} from "../../controllers/me/exercises.controller.js";
import { verifyFirebaseToken } from "@/middleware/auth.js";
import { getSmallContentRateLimiter, postSmallRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

router.get("/dashboard", verifyFirebaseToken as any, getSmallContentRateLimiter, getExerciseDashboardController as any);
router.get("/history", verifyFirebaseToken as any, getSmallContentRateLimiter, getExerciseHistoryController as any);
router.get("/:id/report", verifyFirebaseToken as any, getSmallContentRateLimiter, getExerciseByIdController as any);
router.post("/:id/submit", verifyFirebaseToken as any, postSmallRateLimiter, submitExerciseController as any);

export default router;
