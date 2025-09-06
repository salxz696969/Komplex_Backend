import { Router } from "express";
import {
  getExerciseHistoryController,
  getExerciseDashboardController,
  getExerciseByIdController,
  submitExerciseController,
} from "../../controllers/me/exercises.controller.js";

const router = Router();

router.get("/dashboard", getExerciseDashboardController);
router.get("/history", getExerciseHistoryController);
router.get("/:id/report", getExerciseByIdController);
router.post("/:id/submit", submitExerciseController);

export default router;
