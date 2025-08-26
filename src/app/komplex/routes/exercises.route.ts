import { Router } from "express";
import {
  getExercise,
  getExercises,
  submitExercise,
} from "../controllers/exercises.controller";

const router = Router();

// Add your route handlers here

router.get("/", getExercises);
router.get("/:id", getExercise);

router.post("/:id/submit", submitExercise);

export default router;
