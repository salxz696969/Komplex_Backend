import { Router } from "express";
import { getAllVideos } from "../controllers/videos.controller";
const router = Router();

// Add your route handlers here
router.get("/", getAllVideos);

export default router;
