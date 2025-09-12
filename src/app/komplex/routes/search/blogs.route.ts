import { Router } from "express";
import { blogSearchController } from "../../controllers/search/blogs.controller.js";
import { searchRateLimiter } from "@/middleware/redisLimiter.js";
import { verifyFirebaseToken } from "@/middleware/auth.js";

const router = Router();

router.get("/", verifyFirebaseToken as any, searchRateLimiter, blogSearchController as any);

export default router;
