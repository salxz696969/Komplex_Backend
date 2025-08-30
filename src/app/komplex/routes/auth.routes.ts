import express from "express";
import passport from "../../../config/passport";
import { handleOAuthSuccess } from "../controllers/auth.controller";

const router = express.Router();

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  handleOAuthSuccess as any     
);

export default router;
