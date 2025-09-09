import { Router } from "express";
import { getSubjects } from "../controllers/subjects.controller.js";
import { adminGetSmallContentRateLimiter } from "@/middleware/redisLimiter.js";
const router = Router();

router.get("/", adminGetSmallContentRateLimiter, getSubjects);
// router.post("/exercises", createExercise);

export default router;
