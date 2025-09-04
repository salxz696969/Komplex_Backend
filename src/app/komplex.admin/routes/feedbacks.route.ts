import { Router } from "express";
import {
  getFeedbacks,
  updateFeedbackStatus,
} from "../controllers/feedbacks.controller.js";

const router = Router();

router.get("/", getFeedbacks);
router.patch("/:id", updateFeedbackStatus);
export default router;
