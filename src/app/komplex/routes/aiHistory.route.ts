import {Router} from "express";
import { getAiHistoryForAUser, postAiHistoryForAUser } from "../controllers/aiHistory.controller.js";
const router = Router();

router.get("/", getAiHistoryForAUser);
router.post("/", postAiHistoryForAUser);

export default router;