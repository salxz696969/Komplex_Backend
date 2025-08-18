import { Router } from "express";
import {
  getFeedbacks,
  updateFeedbackStatus,
} from "../controllers/feedbacks.controller";

const router = Router();

router.get("/", getFeedbacks);
router.patch("/:id", updateFeedbackStatus);
export default router;
