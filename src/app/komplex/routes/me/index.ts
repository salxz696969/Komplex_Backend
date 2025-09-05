import { Router } from "express";
import blogsRouter from "./blogs.route.js";
import forumsRouter from "./forums.route.js";
import videosRouter from "./videos.route.js";
import exercisesRouter from "./exercises.route.js";
import followRouter from "./follow.route.js";
import feedbackRouter from "./feedback.route.js";
import { getUserContentDashboard } from "../../controllers/me/dashboard.controller.js";

const router = Router();

// My content and interactions
router.get("/dashboard", getUserContentDashboard); // GET /me/dashboard - my dashboard

router.use("/blogs", blogsRouter);
router.use("/forums", forumsRouter);
router.use("/videos", videosRouter);
router.use("/exercises", exercisesRouter);
router.use("/follow", followRouter);
router.use("/feedback", feedbackRouter);

export default router;
