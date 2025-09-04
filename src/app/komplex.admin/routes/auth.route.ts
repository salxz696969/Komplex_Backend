import { Router } from "express";
import { handleLogin } from "../controllers/auth.controller.js";

const router = Router();

router.post("/login", handleLogin as any);

export default router;