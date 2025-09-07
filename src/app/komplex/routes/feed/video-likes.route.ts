import { Router } from "express";
import { getVideoLikesController } from "../../controllers/feed/video-likes.controller.js";

const router = Router();

router.get("/:id", getVideoLikesController as any);

export default router;
