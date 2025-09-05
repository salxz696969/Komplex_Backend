import { Router } from "express";
import blogsRouter from "./blogs.route.js";
import forumsRouter from "./forums.route.js";
import videosRouter from "./videos.route.js";
import profileRouter from "./profile.route.js";

const router = Router();

// Other users' content (read-only)
router.use("/:id/blogs", blogsRouter);
router.use("/:id/forums", forumsRouter);
router.use("/:id/videos", videosRouter);
router.use("/:id/profile", profileRouter);

export default router;
