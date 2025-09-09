import { verifyFirebaseToken } from "../../../middleware/auth.js";
import express from "express";
import {
  handleSignup,
  handleSocialLogIn,
} from "../controllers/auth.controller.js";
import { userLoginRateLimiter, userSignupRateLimiter } from "@/middleware/redisLimiter.js";

const router = express.Router();

router.post("/signup", userSignupRateLimiter, handleSignup as any);
router.post("/social-login", userLoginRateLimiter, handleSocialLogIn as any);

export default router;
