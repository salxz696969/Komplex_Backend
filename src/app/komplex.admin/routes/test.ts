import { Router } from "express";
import upload from "../middleware/upload";
import cloudinary from "../../db/cloudinary/cloudinaryConfig";
import { db } from "../../db/index";
import { blogs } from "../../db/models/blogs";
import { choices } from "../../db/models/choices";
import { exercises } from "../../db/models/exercises";
import { followers } from "../../db/models/followers";
import { forumComments } from "../../db/models/forum_comments";
import { forumLikes } from "../../db/models/forum_likes";
import { forumMedias } from "../../db/models/forum_medias";
import { forumReplies } from "../../db/models/forum_replies";
import { forums } from "../../db/models/forums";
import { questions } from "../../db/models/questions";
import { userExerciseHistory } from "../../db/models/user_exercise_history";
import { userSavedBlogs } from "../../db/models/user_saved_blogs";
import { userSavedVideos } from "../../db/models/user_saved_videos";
import { userVideoHistory } from "../../db/models/user_video_history";
import { users } from "../../db/models/users";
import { videoComments } from "../../db/models/video_comments";
import { videoLikes } from "../../db/models/video_likes";
import { videoReplies } from "../../db/models/video_replies";
import { videos } from "../../db/models/videos";
const router = Router();

// Add your route handlers here
router.post("/upload", upload.single("file"), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ success: false, message: "No file uploaded" });
		}

		// Upload buffer to Cloudinary
		const stream = cloudinary.uploader.upload_stream(
			{ folder: "my_app_uploads", resource_type: "auto" }, // auto handles images & videos
			(error, result) => {
				if (error) {
					console.error(error);
					return res.status(500).json({ success: false, error: error.message });
				}
				if (result) {
					// send back the Cloudinary URL
					return res.json({ success: true, url: result.secure_url });
				}
			}
		);

		stream.end(req.file.buffer);
	} catch (err) {
		res.status(500).json({ success: false, error: (err as Error).message });
	}
});

router.delete("/delete", async (req, res) => {
	try {
		const { public_id } = req.body;

		if (!public_id) {
			return res.status(400).json({ success: false, message: "public_id is required" });
		}

		// Delete from Cloudinary
		const result = await cloudinary.uploader.destroy(public_id, { resource_type: "image" });

		res.json({ success: true, result });
	} catch (err) {
		res.status(500).json({ success: false, error: (err as Error).message });
	}
});

router.get("/drizzle", async (req, res) => {
	const blog = await db.select().from(blogs);
	const choice = await db.select().from(choices);
	const exercise = await db.select().from(exercises);
	const follower = await db.select().from(followers);
	const forumComment = await db.select().from(forumComments);
	const forumLike = await db.select().from(forumLikes);
	const forumMedia = await db.select().from(forumMedias);
	const forumReply = await db.select().from(forumReplies);
	const forum = await db.select().from(forums);
	const question = await db.select().from(questions);
	const userExerciseHistory1 = await db.select().from(userExerciseHistory);
	const userSavedBlog = await db.select().from(userSavedBlogs);
	const userSavedVideo = await db.select().from(userSavedVideos);
	const userVideoHistory1 = await db.select().from(userVideoHistory);
	const user = await db.select().from(users);
	const videoComment = await db.select().from(videoComments);
	const videoLike = await db.select().from(videoLikes);
	const videoReply = await db.select().from(videoReplies);
	const video = await db.select().from(videos);
	res.json({
		blog,
		choice,
		exercise,
		follower,
		forumComment,
		forumLike,
		forumMedia,
		forumReply,
		forum,
		question,
		userExerciseHistory1,
		userSavedBlog,
		userSavedVideo,
		userVideoHistory1,
		user,
		videoComment,
		videoLike,
		videoReply,
		video,
	});
});

export default router;
