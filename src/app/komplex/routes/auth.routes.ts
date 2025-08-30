import express from "express";
import googlePassport from "../../../config/passport/google";
import microsoftPassport from "../../../config/passport/microsoft";
import discordPassport from "../../../config/passport/discord";
import { handleOAuthSuccess } from "../controllers/auth.controller";

const router = express.Router();

// GOOGLE ----------------------

router.get(
  "/google",
  googlePassport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  googlePassport.authenticate("google", {
    failureRedirect: "http://localhost:4000/auth",
    successRedirect: "http://localhost:4000",
  }),
  handleOAuthSuccess as any
);

// MICROSOFT ----------------------

router.get("/microsoft", microsoftPassport.authenticate("microsoft"));

router.get(
  "/microsoft/callback",
  microsoftPassport.authenticate("microsoft", {
    failureRedirect: "http://localhost:4000/auth",
    successRedirect: "http://localhost:4000",
  }),
  handleOAuthSuccess as any
);

// DISCORD ----------------------

router.get("/discord", discordPassport.authenticate("discord"));

router.get(
  "/discord/callback",
  discordPassport.authenticate("discord", {
    failureRedirect: "http://localhost:4000/auth",
    successRedirect: "http://localhost:4000",
  }),
  handleOAuthSuccess as any
);

export default router;
