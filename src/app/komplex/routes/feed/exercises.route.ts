import { verifyFirebaseTokenOptional } from "./../../../../middleware/auth.js";
import { Router } from "express";
import {
  getExercisesController,
  getExerciseController,
  // TODO: Future features
  // getExerciseStats, // GET /exercises/:id/stats - exercise statistics
  // getExerciseLeaderboard, // GET /exercises/:id/leaderboard - top performers
} from "../../controllers/feed/exercises.controller.js";
import { getSmallContentRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

router.get("/", verifyFirebaseTokenOptional as any, getSmallContentRateLimiter, getExercisesController as any);
router.get("/:id", verifyFirebaseTokenOptional as any, getSmallContentRateLimiter, getExerciseController as any);

// TODO: Future features
// router.get("/:id/stats", getExerciseStats); // Exercise statistics
// router.get("/:id/leaderboard", getExerciseLeaderboard); // Top performers

export default router;
