import { verifyFirebaseToken } from "@/middleware/auth.js";
import { Router } from "express";
import { callAiAndWriteToHistory } from "../../controllers/me/ai.controller.js";
import { aiRateLimiter } from "@/middleware/redisLimiter.js";
const router = Router();

router.post(
  "/",
  verifyFirebaseToken as any,
  aiRateLimiter,
  callAiAndWriteToHistory as any
);

export default router;
