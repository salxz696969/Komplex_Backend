import { verifyFirebaseToken } from "@/middleware/auth.js";
import { Router } from "express";
import { callAiAndWriteToHistory, getMyAiHistoryController } from "../../controllers/me/ai.controller.js";
import { aiRateLimiter } from "@/middleware/redisLimiter.js";
const router = Router();

router.post("/", verifyFirebaseToken as any, aiRateLimiter, callAiAndWriteToHistory as any);
router.get("/", aiRateLimiter, verifyFirebaseToken as any, getMyAiHistoryController as any);
export default router;
