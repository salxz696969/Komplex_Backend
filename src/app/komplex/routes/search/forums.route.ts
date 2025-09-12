import { Router } from "express";
import { forumSearchController } from "../../controllers/search/forums.controller.js";
import { searchRateLimiter } from "@/middleware/redisLimiter.js";
import { verifyFirebaseToken } from "@/middleware/auth.js";

const router = Router();
router.get("/", verifyFirebaseToken as any, searchRateLimiter, forumSearchController as any);

export default router;
