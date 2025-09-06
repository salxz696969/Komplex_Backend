import { Router } from "express";
import blogsRouter from "./blogs.route.js";
import forumsRouter from "./forums.route.js";
import forumCommentsRouter from "./forum-comments.route.js";
import forumRepliesRouter from "./forum-replies.route.js";
import videosRouter from "./videos.route.js";
import videoHistoryRouter from "./video-history.route.js";
import videoCommentsRouter from "./video-comments.route.js";
import videoRepliesRouter from "./video-replies.route.js";
import exercisesRouter from "./exercises.route.js";
import followRouter from "./follow.route.js";
import feedbackRouter from "./feedback.route.js";
import aiHistoryRouter from "./aiHistory.route.js";
import { getUserContentDashboardController } from "../../controllers/me/dashboard.controller.js";

const router = Router();

// My content and interactions
router.get("/dashboard", getUserContentDashboardController); // GET /me/dashboard - my dashboard

router.use("/blogs", blogsRouter);

router.use("/forums", forumsRouter);
router.use("/forum-comments", forumCommentsRouter);
router.use("/forum-replies", forumRepliesRouter);

router.use("/videos", videosRouter);
router.use("/video-history", videoHistoryRouter);
router.use("/video-comments", videoCommentsRouter);
router.use("/video-replies", videoRepliesRouter);

router.use("/exercises", exercisesRouter);

router.use("/follow", followRouter); // empty for now

router.use("/feedback", feedbackRouter);

router.use("/ai-history", aiHistoryRouter);

export default router;
