import { Router } from "express";
import {
  createExercise,
  deleteExercise,
  getExercise,
  getExerciseDashboard,
  getExercises,
} from "../controllers/exercises.controller";
const router = Router();

router.get("/", getExercises);
router.get("/:id", getExercise);
router.post("/", createExercise);
router.delete("/", deleteExercise);
router.get("/dashboard", getExerciseDashboard);

export default router;
