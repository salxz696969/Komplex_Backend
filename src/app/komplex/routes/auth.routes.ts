import { verifyFirebaseToken } from "../../../middleware/auth.js";
import express from "express";
import {
  handleSignup,
  handleSocialLogIn,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/signup", handleSignup as any);
router.post("/social-login", handleSocialLogIn as any);

export default router;
