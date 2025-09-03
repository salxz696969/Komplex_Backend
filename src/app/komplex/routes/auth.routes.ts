import { verifyFirebaseToken } from "./../../../middleware/auth";
import express from "express";
import {
  getCurrentUser,
  handleSignup,
  handleSocialLogIn,
} from "../controllers/auth.controller";

const router = express.Router();

router.post("/signup", handleSignup as any);
router.post("/social-login", handleSocialLogIn as any);
router.get("/me", verifyFirebaseToken as any, getCurrentUser as any);

export default router;
