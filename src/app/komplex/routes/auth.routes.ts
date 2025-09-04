import { verifyFirebaseToken } from "./../../../middleware/auth.js";
import express from "express";
import {
  getCurrentUser,
  handleSignup,
  handleSocialLogIn,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/signup", handleSignup as any);
router.post("/social-login", handleSocialLogIn as any);
router.get("/me", verifyFirebaseToken as any, getCurrentUser as any);

export default router;
