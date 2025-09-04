import { Router } from "express";
import { createFeedback } from "../controllers/feedback.controller.js";

const router = Router();

router.post("/", createFeedback);

export default router;