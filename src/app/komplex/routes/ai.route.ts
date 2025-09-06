import { Router } from "express";
import { callAiAndWriteToHistory } from "../controllers/ai.controller.js";
const router = Router();

router.post("/", callAiAndWriteToHistory);

export default router;
