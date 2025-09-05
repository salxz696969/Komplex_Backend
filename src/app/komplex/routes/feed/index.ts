import { Router } from "express";
import blogsRouter from "./blogs.route.js";
import forumsRouter from "./forums.route.js";
import videosRouter from "./videos.route.js";
import exercisesRouter from "./exercises.route.js";
import usersRouter from "./users.route.js";

const router = Router();

// Feed routes - public content discovery
router.use("/blogs", blogsRouter);
router.use("/forums", forumsRouter);
router.use("/videos", videosRouter);
router.use("/exercises", exercisesRouter);
router.use("/users", usersRouter);

export default router;
