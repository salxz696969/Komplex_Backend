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
import testRouter from "./test.js";
import geminiRouter from "./gemini.route.js";
import aiHistoryRouter from "./aiHistory.route.js";

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
router.use("/test", testRouter);
router.use("/gemini", geminiRouter);
router.use("/ai-history", aiHistoryRouter);

export default router;
