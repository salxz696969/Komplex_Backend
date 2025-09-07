import { Router } from "express";
import { getVideoCommentsController } from "../../controllers/feed/video-comments.controller.js";

const router = Router();

router.get("/:id", getVideoCommentsController as any);

export default router;
