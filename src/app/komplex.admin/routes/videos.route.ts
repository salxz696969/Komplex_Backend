import { Router } from "express";
import {
  getAllVideos,
  getVideoById,
} from "../controllers/videos.controller.js";
const router = Router();

// Add your route handlers here
router.get("/", getAllVideos);
router.get("/:id", getVideoById);

export default router;
