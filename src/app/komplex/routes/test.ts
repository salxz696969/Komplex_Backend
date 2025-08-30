import { Router } from "express";
// import upload from "../../middleware/upload";
import cloudinary from "../../../db/cloudinary/cloudinaryConfig";
import { db } from "../../../db/index";
import { blogs } from "../../../db/models/blogs";
import { choices } from "../../../db/models/choices";
import { exercises } from "../../../db/models/exercises";
import { followers } from "../../../db/models/followers";
import { forumComments } from "../../../db/models/forum_comments";
import { forumLikes } from "../../../db/models/forum_likes";
import { forumMedias } from "../../../db/models/forum_medias";
import { forumReplies } from "../../../db/models/forum_replies";
import { forums } from "../../../db/models/forums";
import { questions } from "../../../db/models/questions";
import { userExerciseHistory } from "../../../db/models/user_exercise_history";
import { userSavedBlogs } from "../../../db/models/user_saved_blogs";
import { userSavedVideos } from "../../../db/models/user_saved_videos";
import { userVideoHistory } from "../../../db/models/user_video_history";
import { users } from "../../../db/models/users";
import { videoComments } from "../../../db/models/video_comments";
import { videoLikes } from "../../../db/models/video_likes";
import { videoReplies } from "../../../db/models/video_replies";
import { videos } from "../../../db/models/videos";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../../db/cloudinary/cloundinaryFunction";
import { blogMedia } from "../../../db/models/blog_media";
import { mediaTypeEnum } from "../../../db/schema";
import { PgEnum } from "drizzle-orm/pg-core";
import { and, eq } from "drizzle-orm";
import { deleteReply } from "../controllers/forum_replies.controller";
import fs from "fs";
import r2 from "../../../db/cloudflare/cloudflareConfig";
import { Request, Response } from "express";
import { uploadVideoAndThumbnail } from "../../../middleware/upload";
import {
  deleteFromCloudflare,
  uploadImageToCloudflare,
  uploadVideoToCloudflare,
} from "../../../db/cloudflare/cloudflareFunction";

const router = Router();

// Add your route handlers here
router.delete("/delete-blog-media", async (req, res) => {
  const deleteResult = await db
    .delete(blogMedia)
    .where(
      and(
        eq(blogMedia.blogId, 3),
        eq(blogMedia.urlForDeletion, "my_app_uploads/hrhbmpoblp66tvyllhjk")
      )
    )
    .returning();
  // const row = await db.select({ url: blogMedia.urlForDeletion }).from(blogMedia).where(eq(blogMedia.blogId, 3));

  res.json(deleteResult); // Compare exactly what’s in the DB vs what you pass to eq()
});

// // router.post("/upload", upload.single("file"), async (req, res) => {
// // 	try {
// // 		if (!req.file) {
// // 			return res.status(400).json({ success: false, message: "No file uploaded" });
// // 		}

// // 		// Upload buffer to Cloudinary
// // 		const stream = cloudinary.uploader.upload_stream(
// // 			{ folder: "my_app_uploads", resource_type: "auto" }, // auto handles images & videos
// // 			(error, result) => {
// // 				if (error) {
// // 					console.error(error);
// // 					return res.status(500).json({ success: false, error: error.message });
// // 				}
// // 				if (result) {
// // 					// send back the Cloudinary URL
// // 					return res.json({ success: true, url: result.secure_url });
// // 				}
// // 			}
// // 		);

// // 		stream.end(req.file.buffer);
// // 	} catch (err) {
// // 		res.status(500).json({ success: false, error: (err as Error).message });
// // 	}
// // });
// // router.post("/uploads", upload.any(), async (req, res) => {
// 	try {
// 		const userId = 1;
// 		const { title, description, type, topic } = req.body;

// 		let public_url: string | null = null;
// 		let mediaType: "image" | "video" | null = null;

// 		// Handle optional file upload
// 		if (Array.isArray(req.files) && req.files.length > 0) {
// 			const file = req.files[0];
// 			console.log("File received:", file.originalname);

// 			// Upload to Cloudinary
// 			const result = await uploadToCloudinary(file.buffer, "my_app_uploads", "auto");
// 			// Type assertion to access secure_url
// 			public_url = (result as { secure_url: string }).secure_url; // Use secure_url from Cloudinary
// 			mediaType = file.mimetype.startsWith("video") ? "video" : "image";
// 		}

// 		// Insert blog into database
// 		const newBlog = await db
// 			.insert(blogs)
// 			.values({
// 				userId: Number(userId),
// 				title,
// 				description,
// 				type,
// 				topic,
// 				viewCount: 0,
// 				likeCount: 0,
// 				createdAt: new Date(),
// 				updatedAt: new Date(),
// 			})
// 			.returning();

// 		// Send response including uploaded file URL (if any)
// 		res.status(201).json({
// 			success: true,
// 			blog: newBlog,
// 			public_url,
// 			mediaType,
// 		});
// 	} catch (err) {
// 		console.error(err);
// 		res.status(500).json({ success: false, error: (err as Error).message });
// 	}
// // });

router.get("/media", async (req, res) => {
  const post = await db
    .insert(blogMedia)
    .values({
      blogId: 1,
      url: "https://res.cloudinary.com/dc5uhjhun/image/upload/v1755072063/my_app_uploads/smtmnrt9rp2kokpptg3h.png",
      mediaType: "image",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  res.json(post);
});

router.delete("/delete", async (req, res) => {
  try {
    const { public_id } = req.body;

    if (!public_id) {
      return res
        .status(400)
        .json({ success: false, message: "public_id is required" });
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: "image",
    });

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

router.delete("/delete-reply", async (req, res) => {
  await deleteReply(1, null, 10);
  res.json({ success: true });
});

router.get("/ping", (req, res) => {
  res.json({ message: "pong" });
});

// router.post("/upload-video", upload.single("file"), async (req, res) => {
// 	try {
// 		if (req.file) {
// 			if (!req.file.mimetype.startsWith("video")) {
// 				throw new Error("Only video files are allowed.");
// 			}
// 			const result = await uploadToCloudinary(req.file.buffer, "my_app_uploads", "auto");
// 			const secure_url = (result as { secure_url: string }).secure_url;
// 			const public_id = (result as { public_id: string }).public_id;
// 			const duration = (result as { duration?: number }).duration ?? 0;
// 			const thumbnail_url = (result as { thumbnail_url?: string }).thumbnail_url ?? "";
// 			return res.json({
// 				success: true,
// 				secure_url,
// 				public_id,
// 				duration,
// 				thumbnail_url,
// 			});
// 		} else {
// 			return res.status(400).json({ success: false, message: "No video file uploaded." });
// 		}
// 	} catch (err) {
// 		res.status(500).json({ success: false, error: (err as Error).message });
// 	}
// });

router.delete("/delete-video", async (req, res) => {
  const publicId = "my_app_uploads/ukswwa5f2fmyjk0engbs";

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });
    res.json({ success: true, message: "Photo deleted successfully", result });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// router.post("/upload/photo", upload.single("file"), async (req: Request, res: Response) => {
// 	if (!req.file) return res.status(400).json({ error: "No file uploaded" });

// 	try {
// 		await r2
// 			.upload({
// 				Bucket: "komplex-image",
// 				Key: req.file.originalname,
// 				Body: req.file.buffer,
// 				ContentType: req.file.mimetype,
// 			})
// 			.promise();

// 		const fileUrl = `${process.env.R2_PHOTO_PUBLIC_URL}/${req.file.originalname}`;

// 		res.json({ message: "Uploaded to photos bucket!", url: fileUrl, key: req.file.originalname });
// 	} catch (err: any) {
// 		res.status(500).json({ error: err.message });
// 	}
// });

// Upload to videos bucket
// router.post("/upload/video", upload.single("file"), async (req: Request, res: Response) => {
// 	if (!req.file) return res.status(400).json({ error: "No file uploaded" });

// 	try {
// 		await r2
// 			.upload({
// 				Bucket: "komplex-video",
// 				Key: req.file.originalname,
// 				Body: req.file.buffer,
// 				ContentType: req.file.mimetype,
// 			})
// 			.promise();

// 		const fileUrl = `${process.env.R2_VIDEO_PUBLIC_URL}/${req.file.originalname}`;

// 		res.json({ message: "Uploaded to videos bucket!", url: fileUrl, key: req.file.originalname });
// 	} catch (err: any) {
// 		res.status(500).json({ error: err.message });
// 	}
// });

// Delete a photo
// router.delete("/delete/photo/:key", async (req: Request, res: Response) => {
// 	const { key } = req.params;
// 	if (!key) return res.status(400).json({ error: "No key provided" });

// 	try {
// 		await r2
// 			.deleteObject({
// 				Bucket: "komplex-image",
// 				Key: key,
// 			})
// 			.promise();

// 		res.json({ message: `Deleted photo: ${key}` });
// 	} catch (err: any) {
// 		res.status(500).json({ error: err.message });
// 	}
// });

// Delete a video
// router.delete("/delete/video/:key", async (req: Request, res: Response) => {
// 	const { key } = req.params;
// 	if (!key) return res.status(400).json({ error: "No key provided" });

// 	try {
// 		await r2
// 			.deleteObject({
// 				Bucket: "komplex-video",
// 				Key: key,
// 			})
// 			.promise();

// 		res.json({ message: `Deleted video: ${key}` });
// 	} catch (err: any) {
// 		res.status(500).json({ error: err.message });
// 	}
// });

router.post(
  "/upload-video-and-thumbnail",
  uploadVideoAndThumbnail,
  async (req, res) => {
    try {
      let videoFile: any;
      let imageFile: any;

      if (
        req.files &&
        typeof req.files === "object" &&
        "video" in req.files &&
        "image" in req.files
      ) {
        videoFile = (
          req.files as { [fieldname: string]: Express.Multer.File[] }
        ).video[0];
        imageFile = (
          req.files as { [fieldname: string]: Express.Multer.File[] }
        ).image[0];
      } else {
        return res.status(400).json({ error: "Files not uploaded correctly" });
      }

      // Upload to Cloudflare
      const videoUrl = await uploadVideoToCloudflare(
        videoFile.filename,
        await fs.promises.readFile(videoFile.path),
        videoFile.mimetype
      );
      const imageUrl = await uploadImageToCloudflare(
        imageFile.filename,
        await fs.promises.readFile(imageFile.path),
        imageFile.mimetype
      );

      // Delete local files
      await fs.promises.unlink(videoFile.path);
      await fs.promises.unlink(imageFile.path);

      res.json({ success: true, videoUrl, imageUrl });
    } catch (err) {
      console.error(err);
      res
        .status(500)
        .json({ error: err instanceof Error ? err.message : String(err) });
    }
  }
);

router.delete("/delete-cloudflare", async () => {
  await deleteFromCloudflare("komplex-video", "1756106158205-video.mp4");
  await deleteFromCloudflare("komplex-image", "1756106158193-image.png");
});
export default router;
