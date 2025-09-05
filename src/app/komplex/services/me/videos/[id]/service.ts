import { Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/index.js";
import {
  videoLikes,
  userSavedVideos,
  videos,
  videoComments,
  choices,
  exercises,
  questions as questionsTable,
  users,
} from "@/db/schema.js";
import { AuthenticatedRequest } from "@/types/request.js";
import {
  uploadVideoToCloudflare,
  uploadImageToCloudflare,
  deleteFromCloudflare,
} from "@/db/cloudflare/cloudflareFunction.js";
import { deleteVideoCommentInternal } from "../../video-replies/service.js"; // TODO: move to utils folder
import fs from "fs";

export const postVideoPresigned = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: 1 };
    const {
      videoKey,
      title,
      description,
      topic,
      type,
      thumbnailKey,
      questions,
    } = req.body;

    // Validate that the user exists
    const userExists = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, Number(userId)))
      .limit(1);

    if (userExists.length === 0) {
      return res.status(400).json({
        success: false,
        error: `User with ID ${userId} does not exist`,
      });
    }

    const videoUrl = `${process.env.R2_VIDEO_PUBLIC_URL}/${videoKey}`;
    const thumbnailUrl = `${process.env.R2_PHOTO_PUBLIC_URL}/${thumbnailKey}`;

    const newVideo = await db
      .insert(videos)
      .values({
        videoUrlForDeletion: videoKey,
        videoUrl,
        thumbnailUrlForDeletion: thumbnailKey,
        thumbnailUrl,
        title,
        description,
        topic,
        type,
        viewCount: 0,
        duration: 0,
        userId: Number(userId),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Create exercise for video quiz
    console.log(questions);

    // questions
    // :
    // [{title: "1+1", choices: [{text: "2", isCorrect: true}, {text: "3", isCorrect: false}]}]
    // 0
    // :
    // {title: "1+1", choices: [{text: "2", isCorrect: true}, {text: "3", isCorrect: false}]}

    const newExercise = await db
      .insert(exercises)
      .values({
        videoId: newVideo[0].id,
        title: `Quiz for ${title}`,
        description: `Multiple choice questions for the video: ${title}`,
        subject: topic || "General",
        grade: "All",
        duration: 0,
        userId: Number(userId),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    for (const question of questions) {
      const newQuestion = await db
        .insert(questionsTable)
        .values({
          exerciseId: newExercise[0].id,
          title: question.title,
          questionType: "",
          section: "",
          imageUrl: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      for (const choice of question.choices) {
        await db.insert(choices).values({
          questionId: newQuestion[0].id,
          text: choice.text,
          isCorrect: choice.isCorrect,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return res.status(201).json({ success: true, video: newVideo });
  } catch (error) {
    console.error("postVideoPresigned error:", error);
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
      details: error instanceof Error ? error.stack : "Unknown error",
    });
  }
};

export const likeVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const like = await db
      .insert(videoLikes)
      .values({
        userId: Number(userId),
        videoId: Number(id),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return res.status(200).json({ like });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const unlikeVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const unlike = await db
      .delete(videoLikes)
      .where(
        and(
          eq(videoLikes.userId, Number(userId)),
          eq(videoLikes.videoId, Number(id))
        )
      )
      .returning();

    return res.status(200).json({ unlike });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const saveVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: "1" };

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const videoToSave = await db.insert(userSavedVideos).values({
      userId: Number(userId),
      videoId: Number(id),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return res.status(200).json({
      success: true,
      message: "Video saved successfully",
      video: videoToSave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const unsaveVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: "1" };

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const videoToUnsave = await db
      .delete(userSavedVideos)
      .where(
        and(
          eq(userSavedVideos.userId, Number(userId)),
          eq(userSavedVideos.videoId, Number(id))
        )
      )
      .returning();

    if (!videoToUnsave || videoToUnsave.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Video unsaved successfully",
      video: videoToUnsave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const updateVideo = async (req: AuthenticatedRequest, res: Response) => {
  let videoFile: Express.Multer.File | undefined;
  let thumbnailFile: Express.Multer.File | undefined;

  try {
    const { userId } = req.user ?? { userId: "1" };
    const { id } = req.params;
    const { title, description, type, topic } = req.body;

    if (!id || !title || !description || !type || !topic) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const [doesUserOwnThisVideo] = await db
      .select()
      .from(videos)
      .where(and(eq(videos.id, Number(id)), eq(videos.userId, Number(userId))))
      .limit(1);

    if (!doesUserOwnThisVideo) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }

    if (
      req.files &&
      typeof req.files === "object" &&
      "video" in req.files &&
      "image" in req.files
    ) {
      videoFile = (req.files as { [fieldname: string]: Express.Multer.File[] })
        .video[0];
      thumbnailFile = (
        req.files as { [fieldname: string]: Express.Multer.File[] }
      ).image[0];
    }

    const uniqueKey =
      videoFile && thumbnailFile
        ? `${videoFile.filename}-${crypto.randomUUID()}-${
            thumbnailFile.filename
          }`
        : crypto.randomUUID();

    let newVideoUrl: string | null = null;
    if (videoFile) {
      const [videoUrlForDeletionForThisVideo] = await db
        .select({ videoUrlForDeletion: videos.videoUrlForDeletion })
        .from(videos)
        .where(eq(videos.id, Number(id)))
        .limit(1);

      await deleteFromCloudflare(
        "komplex-video",
        videoUrlForDeletionForThisVideo.videoUrlForDeletion ?? ""
      );
      newVideoUrl = await uploadVideoToCloudflare(
        uniqueKey,
        await fs.promises.readFile(videoFile.path),
        videoFile.mimetype
      );
    }

    let newThumbnailUrl: string | null = null;
    if (thumbnailFile) {
      const [thumbnailUrlForDeletionForThisVideo] = await db
        .select({ thumbnailUrlForDeletion: videos.thumbnailUrlForDeletion })
        .from(videos)
        .where(eq(videos.id, Number(id)))
        .limit(1);

      await deleteFromCloudflare(
        "komplex-video",
        thumbnailUrlForDeletionForThisVideo.thumbnailUrlForDeletion ?? ""
      );
      newThumbnailUrl = await uploadImageToCloudflare(
        uniqueKey,
        await fs.promises.readFile(thumbnailFile.path),
        thumbnailFile.mimetype
      );
    }

    const updateData: Partial<typeof videos.$inferInsert> = {
      title,
      description,
      type,
      topic,
      updatedAt: new Date(),
    };

    if (newVideoUrl) {
      updateData.videoUrl = newVideoUrl;
      updateData.videoUrlForDeletion = uniqueKey;
    }

    if (newThumbnailUrl) {
      updateData.thumbnailUrl = newThumbnailUrl;
      updateData.thumbnailUrlForDeletion = uniqueKey;
    }

    const updateVideo = await db
      .update(videos)
      .set(updateData)
      .where(eq(videos.id, Number(id)))
      .returning();

    return res.status(200).json({ success: true, updateVideo });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  } finally {
    // cleanup temp files
    if (videoFile) await fs.promises.unlink(videoFile.path).catch(() => {});
    if (thumbnailFile)
      await fs.promises.unlink(thumbnailFile.path).catch(() => {});
  }
};

export const deleteVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.user ?? { userId: "1" };
    const { id } = req.params;

    // Check ownership
    const [doesThisUserOwnThisVideo] = await db
      .select({
        videoUrlForDeletion: videos.videoUrlForDeletion,
        thumbnailUrlForDeletion: videos.thumbnailUrlForDeletion,
      })
      .from(videos)
      .where(and(eq(videos.id, Number(id)), eq(videos.userId, Number(userId))));

    if (!doesThisUserOwnThisVideo) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found or unauthorized" });
    }

    const [doesThisVideoHasComments] = await db
      .select()
      .from(videoComments)
      .where(eq(videoComments.videoId, Number(id)))
      .limit(1);

    let deleteComments = null;
    if (doesThisVideoHasComments) {
      // If the video has comments, we need to delete them as well
      deleteComments = await deleteVideoCommentInternal(
        Number(userId),
        null,
        Number(id)
      );
    }

    // Delete likes
    const deletedLikes = await db
      .delete(videoLikes)
      .where(eq(videoLikes.videoId, Number(id)))
      .returning();

    // Delete saves
    const deletedSaves = await db
      .delete(userSavedVideos)
      .where(eq(userSavedVideos.videoId, Number(id)))
      .returning();

    // Delete from Cloudinary
    if (doesThisUserOwnThisVideo.videoUrlForDeletion) {
      try {
        await deleteFromCloudflare(
          "komplex-video",
          doesThisUserOwnThisVideo.videoUrlForDeletion
        );
      } catch (err) {
        console.error("Failed to delete video from Cloudflare:", err);
      }
    }

    if (doesThisUserOwnThisVideo.thumbnailUrlForDeletion) {
      try {
        await deleteFromCloudflare(
          "komplex-image",
          doesThisUserOwnThisVideo.thumbnailUrlForDeletion
        );
      } catch (err) {
        console.error("Failed to delete thumbnail from Cloudflare:", err);
      }
    }

    // Delete video record
    const deletedVideo = await db
      .delete(videos)
      .where(and(eq(videos.id, Number(id)), eq(videos.userId, Number(userId))))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Video deleted successfully",
      deletedVideo,
      deletedLikes,
      deletedSaves,
      deleteComments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};
