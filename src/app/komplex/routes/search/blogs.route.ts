import { Router } from "express";
import { blogSearchController } from "../../controllers/search/blogs.controller.js";
import { searchRateLimiter } from "@/middleware/redisLimiter.js";
import { verifyFirebaseTokenOptional } from "@/middleware/auth.js";

const router = Router();

router.get("/", verifyFirebaseTokenOptional as any, searchRateLimiter, blogSearchController as any);

export default router;
