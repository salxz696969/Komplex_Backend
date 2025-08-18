import { Router } from "express";
import { getSubjects } from "../controllers/subjects.controller";
const router = Router();

router.get("/", getSubjects);
// router.post("/exercises", createExercise);

export default router;
