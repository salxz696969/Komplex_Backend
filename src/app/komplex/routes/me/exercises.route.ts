import { Router } from "express";
import {
  getExerciseHistoryController,
  getExerciseDashboardController,
  getExerciseByIdController,
  submitExerciseController,
} from "../../controllers/me/exercises.controller.js";

const router = Router();

router.get("/dashboard", getExerciseDashboardController as any);
router.get("/history", getExerciseHistoryController as any);
router.get("/:id/report", getExerciseByIdController as any);
router.post("/:id/submit", submitExerciseController as any);

export default router;
