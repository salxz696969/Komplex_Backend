import { Router } from "express";
import { getUserVideosController } from "@/app/komplex/controllers/users/videos.controller.js";

const router = Router();

router.get("/", getUserVideosController as any);

export default router;
