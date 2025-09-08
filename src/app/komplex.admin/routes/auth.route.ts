import { Router } from "express";
import { handleLogin } from "../controllers/auth.controller.js";
import { adminLoginRateLimiter } from "@/middleware/redisLimiter.js";

const router = Router();

router.post("/login",  adminLoginRateLimiter, handleLogin as any);

export default router;