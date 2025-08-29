import { Router } from "express";
import { getAllVideos } from "../controllers/videos.controller.js";
const router = Router();

// Add your route handlers here
router.get("/", getAllVideos);

export default router;
