import { Router } from "express";
import {
  createExercise,
  deleteExercise,
  getExerciseDashboard,
  getExercises,
} from "../controllers/exercises.controller";
const router = Router();

router.get("/", getExercises);
router.post("/", createExercise);
router.delete("/", deleteExercise);
router.get("/dashboard", getExerciseDashboard);

export default router;
