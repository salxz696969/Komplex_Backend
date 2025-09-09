import { Router } from "express";
import { getAllVideoRepliesForACommentController } from "../../controllers/feed/video-replies.controller.js";
import { verifyFirebaseToken } from "@/middleware/auth.js";

const router = Router();

router.get("/:id", verifyFirebaseToken as any, getAllVideoRepliesForACommentController as any);

export default router;
