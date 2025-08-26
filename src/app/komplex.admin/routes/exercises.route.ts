import { Router } from "express";
import {
  createExercise,
  deleteExercise,
  getExercise,
  getExerciseDashboard,
  getExercises,
  updateExercise,
} from "../controllers/exercises.controller";
const router = Router();

router.get("/", getExercises);
router.get("/:id", getExercise);
router.post("/", createExercise);
router.delete("/:id", deleteExercise);
router.get("/dashboard", getExerciseDashboard);
router.put("/:id", updateExercise);

export default router;
