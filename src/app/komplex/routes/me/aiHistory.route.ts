import { Router } from "express";
import {
  getAiHistoryForAUserController,
  postAiHistoryForAUserController,
} from "../../controllers/me/aiHistory.controller.js";
const router = Router();

router.get("/", getAiHistoryForAUserController);
router.post("/", postAiHistoryForAUserController);

export default router;
