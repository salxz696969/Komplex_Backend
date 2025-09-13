import { verifyFirebaseToken, verifyFirebaseTokenOptional } from "@/middleware/auth.js";
import { Router } from "express";
import { searchRateLimiter } from "@/middleware/redisLimiter.js";
import { videoSearchController } from "../../controllers/search/videos.controller.js";

const router = Router();
router.get("/", verifyFirebaseTokenOptional as any, searchRateLimiter, videoSearchController as any);

export default router;
