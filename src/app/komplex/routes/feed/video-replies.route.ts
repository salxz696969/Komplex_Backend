import { Router } from "express";
import { getAllVideoRepliesForACommentController } from "../../controllers/feed/video-replies.controller.js";

const router = Router();

router.get("/:id", getAllVideoRepliesForACommentController);

export default router;