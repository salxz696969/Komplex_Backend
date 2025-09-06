import { Router } from "express";
import { createFeedbackController } from "../../controllers/me/feedback.controller.js"; // ! TO CHANGE

const router = Router();

router.post("/", createFeedbackController);

export default router;
