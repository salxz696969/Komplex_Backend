import { Router } from "express";
import blogsRouter from "./blogs.route";
import exercisesRouter from "./exercises.route";
import forumCommentsRouter from "./forum_comments.route";
import forumRepliesRouter from "./forum_replies.route";
import forumsRouter from "./forums.route";
import usersRouter from "./users.route";
import videoCommentsRouter from "./video_comments.route";
import videoLikesRouter from "./video_likes.route";
import videoRepliesRouter from "./video_replies.route";
import videosRouter from "./videos.route";
import userContentRouter from "./user-content.route";
import feedbackRouter from "./feedback.route";
import uploadRouter from "./upload.route";

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

export default router;
