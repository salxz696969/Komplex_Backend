// Feed routes - public content discovery
import { Router } from "express";
import blogsRouter from "./blogs.route.js";
import forumsRouter from "./forums.route.js";
import videosRouter from "./videos.route.js";
import exercisesRouter from "./exercises.route.js";
import usersRouter from "./users.route.js";
import forumCommentsRouter from "./forum-comments.route.js";
import forumRepliesRouter from "./forum-replies.route.js";
import videoCommentsRouter from "./video-comments.route.js";
import videoLikesRouter from "./video-likes.route.js";
import videoRepliesRouter from "./video-replies.route.js";

const router = Router();

router.use("/blogs", blogsRouter);

router.use("/forums", forumsRouter);
router.use("/forum-comments", forumCommentsRouter);
router.use("/forum-replies", forumRepliesRouter);

router.use("/videos", videosRouter);
router.use("/video-comments", videoCommentsRouter);
router.use("/video-likes", videoLikesRouter);
router.use("/video-replies", videoRepliesRouter);

router.use("/exercises", exercisesRouter);
router.use("/users", usersRouter);

export default router;
