import { Router } from "express";
import blogsRouter from "./blogs.route.js";
import exercisesRouter from "./exercises.route.js";
import forumCommentsRouter from "./forum_comments.route.js";
import forumRepliesRouter from "./forum_replies.route.js";
import forumsRouter from "./forums.route.js";
import usersRouter from "./users.route.js";
import videoCommentsRouter from "./video_comments.route.js";
import videoLikesRouter from "./video_likes.route.js";
import videoRepliesRouter from "./video_replies.route.js";
import videosRouter from "./videos.route.js";
import userContentRouter from "./user-content.route.js";
import aiHistoryRouter from "./aiHistory.route.js";
import feedbackRouter from "./feedback.route.js";
import uploadRouter from "./upload.route.js";
import authRouter from "./auth.routes.js";

const router = Router();

router.use("/blogs", blogsRouter);
router.use("/exercises", exercisesRouter);
router.use("/forum_comments", forumCommentsRouter);
router.use("/forum_replies", forumRepliesRouter);
router.use("/forums", forumsRouter);
router.use("/users", usersRouter);
router.use("/video_comments", videoCommentsRouter);
router.use("/video_likes", videoLikesRouter);
router.use("/video_replies", videoRepliesRouter);
router.use("/videos", videosRouter);
router.use("/user-content", userContentRouter);
router.use("/feedback", feedbackRouter);
router.use("/upload", uploadRouter);
router.use("/auth", authRouter);
router.use("/ai-history", aiHistoryRouter);


export default router;
