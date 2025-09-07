import { Router } from "express";
import {
  getAllForumsController,
  getForumByIdController,
  // TODO: Future features - these functions need to be implemented
  // getForumLikes, // GET /forums/:id/likes - who liked this forum
} from "../../controllers/feed/forums.controller.js";
import { verifyFirebaseToken } from "@/middleware/auth.js";

const router = Router();

router.get("/", verifyFirebaseToken as any, getAllForumsController as any);

router.get("/:id", verifyFirebaseToken as any, getForumByIdController as any);

// TODO: Future features
// router.get("/:id/likes", getForumLikes); // Who liked this forum

export default router;
