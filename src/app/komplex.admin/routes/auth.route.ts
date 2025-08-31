import { Router } from "express";
import { handleLogin } from "../controllers/auth.controller";

const router = Router();

router.get("/login", handleLogin as any);

export default router;