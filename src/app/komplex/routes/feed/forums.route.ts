import { Router } from "express";
import {
  getAllForumsController,
  getForumByIdController,
  // TODO: Future features - these functions need to be implemented
  // getForumLikes, // GET /forums/:id/likes - who liked this forum
} from "../../controllers/feed/forums.controller.js";

const router = Router();

router.get("/", getAllForumsController as any);

router.get("/:id", getForumByIdController as any);

// TODO: Future features
// router.get("/:id/likes", getForumLikes); // Who liked this forum

export default router;
