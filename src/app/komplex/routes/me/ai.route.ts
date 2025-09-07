import { Router } from "express";
import { callAiAndWriteToHistory } from "../../controllers/me/ai.controller.js";
const router = Router();

router.post("/", callAiAndWriteToHistory as any);

export default router;
