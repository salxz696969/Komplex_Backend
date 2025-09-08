import { Router } from "express";
import {
	getExerciseHistoryController,
	getExerciseDashboardController,
	getExerciseByIdController,
	submitExerciseController,
} from "../../controllers/me/exercises.controller.js";
import { getSmallContentRateLimiter, postSmallRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

router.get("/dashboard", getSmallContentRateLimiter, getExerciseDashboardController as any);
router.get("/history", getSmallContentRateLimiter, getExerciseHistoryController as any);
router.get("/:id/report", getSmallContentRateLimiter, getExerciseByIdController as any);
router.post("/:id/submit", postSmallRateLimiter, submitExerciseController as any);

export default router;
