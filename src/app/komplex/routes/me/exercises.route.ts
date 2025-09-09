import { Router } from "express";
import {
  getExerciseHistoryController,
  getExerciseDashboardController,
  getExerciseByIdController,
  submitExerciseController,
} from "../../controllers/me/exercises.controller.js";
import { verifyFirebaseToken } from "@/middleware/auth.js";

const router = Router();

router.get("/dashboard", verifyFirebaseToken as any, getExerciseDashboardController as any);
router.get("/history", verifyFirebaseToken as any, getExerciseHistoryController as any);
router.get("/:id/report", verifyFirebaseToken as any, getExerciseByIdController as any);
router.post("/:id/submit", verifyFirebaseToken as any, submitExerciseController as any);

export default router;
