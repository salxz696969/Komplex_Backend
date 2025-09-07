import { verifyFirebaseToken } from "@/middleware/auth.js";
import { Router } from "express";
import {
  getAllBlogsController,
  getBlogByIdController,
  // TODO: Future features
  // getBlogLikes, // GET /blogs/:id/likes - who liked this blog
  // getBlogComments, // GET /blogs/:id/comments - comments on this blog
} from "@/app/komplex/controllers/feed/blogs.controller.js";

const router = Router();

router.get("/", verifyFirebaseToken as any, getAllBlogsController as any);
router.get("/:id", verifyFirebaseToken as any, getBlogByIdController as any);

// TODO: Future interaction endpoints
// router.get("/:id/likes", getBlogLikes); // Who liked this blog
// router.get("/:id/comments", getBlogComments); // Comments on this blog

export default router;
