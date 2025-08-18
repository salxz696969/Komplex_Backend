import { Router } from "express";
import blogsRouter from "./blogs.route";
import exercisesRouter from "./exercises.route";
import forumCommentsRouter from "./forum_comments.route";
import forumRepliesRouter from "./forum_replies.route";
import forumsRouter from "./forums.route";
import mediaTypeRouter from "./media_type.route";
import questionsRouter from "./questions.route";
import usersRouter from "./users.route";
import videoCommentsRouter from "./video_comments.route";
import videoLikesRouter from "./video_likes.route";
import videoRepliesRouter from "./video_replies.route";
import videosRouter from "./videos.route";
import testRouter from "./test";

const router = Router();

router.use("/blogs", blogsRouter);
router.use("/exercises", exercisesRouter);
router.use("/forum_comments", forumCommentsRouter);
router.use("/forum_replies", forumRepliesRouter);
router.use("/forums", forumsRouter);
router.use("/media_type", mediaTypeRouter);
router.use("/questions", questionsRouter);
router.use("/users", usersRouter);
router.use("/video_comments", videoCommentsRouter);
router.use("/video_likes", videoLikesRouter);
router.use("/video_replies", videoRepliesRouter);
router.use("/videos", videosRouter);
router.use("/test", testRouter);

export default router;
