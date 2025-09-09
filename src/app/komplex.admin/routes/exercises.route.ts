import { Router } from "express";
import {
	createExercise,
	deleteExercise,
	getExercise,
	getExerciseDashboard,
	getExercises,
	updateExercise,
} from "../controllers/exercises.controller.js";
import {
	adminBigPostRateLimiter,
	adminBigDeleteRateLimiter,
	adminBigUpdateRateLimiter,
	adminGetBigContentRateLimiter,
  adminGetSmallContentRateLimiter,
  adminSmallPostRateLimiter,
  adminSmallUpdateRateLimiter,
  adminSmallDeleteRateLimiter,
} from "@/middleware/redisLimiter.js"; // Adjust path if needed

const router = Router();

router.get("/", adminGetSmallContentRateLimiter, getExercises);
router.get("/:id", adminGetSmallContentRateLimiter, getExercise);
router.post("/", adminSmallPostRateLimiter, createExercise);
router.delete("/:id", adminSmallDeleteRateLimiter, deleteExercise);
router.get("/dashboard", adminGetSmallContentRateLimiter, getExerciseDashboard);
router.put("/:id", adminSmallUpdateRateLimiter, updateExercise);

export default router;
