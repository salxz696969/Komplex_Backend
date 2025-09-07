import { Router } from "express";
import {
  getExercisesController,
  getExerciseController,
  // TODO: Future features
  // getExerciseStats, // GET /exercises/:id/stats - exercise statistics
  // getExerciseLeaderboard, // GET /exercises/:id/leaderboard - top performers
} from "../../controllers/feed/exercises.controller.js";

const router = Router();

router.get("/", getExercisesController as any);
router.get("/:id", getExerciseController as any);

// TODO: Future features
// router.get("/:id/stats", getExerciseStats); // Exercise statistics
// router.get("/:id/leaderboard", getExerciseLeaderboard); // Top performers

export default router;
