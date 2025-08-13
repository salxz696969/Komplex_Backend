import { Router } from "express";
import { getGrades } from "../controllers/grades.controller";
const router = Router();

router.get("/", getGrades);
// router.post("/exercises", createExercise);

export default router;
