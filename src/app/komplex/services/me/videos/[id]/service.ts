import { and, eq } from "drizzle-orm";
import { db } from "@/db/index.js";
import {
  videoLikes,
  userSavedVideos,
  videos,
  videoComments,
} from "@/db/schema.js";
import {
  uploadVideoToCloudflare,
  uploadImageToCloudflare,
  deleteFromCloudflare,
} from "@/db/cloudflare/cloudflareFunction.js";
import { deleteVideoCommentInternal } from "@/app/komplex/services/me/video-comments/[id]/service.js"; 
import fs from "fs";

export const likeVideo = async (videoId: number, userId: number) => {
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const like = await db
    .insert(videoLikes)
    .values({
      userId: Number(userId),
      videoId: Number(videoId),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return { data: { like } };
};

export const unlikeVideo = async (videoId: number, userId: number) => {
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const unlike = await db
    .delete(videoLikes)
    .where(
      and(
        eq(videoLikes.userId, Number(userId)),
        eq(videoLikes.videoId, Number(videoId))
      )
    )
    .returning();

  return { data: { unlike } };
};

export const saveVideo = async (videoId: number, userId: number) => {
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const videoToSave = await db.insert(userSavedVideos).values({
    userId: Number(userId),
    videoId: Number(videoId),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return {
    data: {
      success: true,
      message: "Video saved successfully",
      video: videoToSave,
    },
  };
};

export const unsaveVideo = async (videoId: number, userId: number) => {
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const videoToUnsave = await db
    .delete(userSavedVideos)
    .where(
      and(
        eq(userSavedVideos.userId, Number(userId)),
        eq(userSavedVideos.videoId, Number(videoId))
      )
    )
    .returning();

  if (!videoToUnsave || videoToUnsave.length === 0) {
    throw new Error("Video not found");
  }

  return {
    data: {
      success: true,
      message: "Video unsaved successfully",
      video: videoToUnsave,
    },
  };
};

export const updateVideo = async (
  id: number,
  body: any,
  files: any,
  userId: number
) => {
  const { title, description, type, topic } = body;

  if (!id || !title || !description || !type || !topic) {
    throw new Error("Missing required fields");
  }

  const [doesUserOwnThisVideo] = await db
    .select()
    .from(videos)
    .where(and(eq(videos.id, Number(id)), eq(videos.userId, Number(userId))))
    .limit(1);

  if (!doesUserOwnThisVideo) {
    throw new Error("Video not found");
  }

  let videoFile: Express.Multer.File | undefined;
  let thumbnailFile: Express.Multer.File | undefined;

  if (
    files &&
    typeof files === "object" &&
    "video" in files &&
    "image" in files
  ) {
    videoFile = (files as { [fieldname: string]: Express.Multer.File[] })
      .video[0];
    thumbnailFile = (files as { [fieldname: string]: Express.Multer.File[] })
      .image[0];
  }

  const uniqueKey =
    videoFile && thumbnailFile
      ? `${videoFile.filename}-${crypto.randomUUID()}-${thumbnailFile.filename}`
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

  // cleanup temp files
  if (videoFile) await fs.promises.unlink(videoFile.path).catch(() => {});
  if (thumbnailFile)
    await fs.promises.unlink(thumbnailFile.path).catch(() => {});

  return { data: { success: true, updateVideo } };
};

export const deleteVideo = async (id: number, userId: number) => {
  // Check ownership
  const [doesThisUserOwnThisVideo] = await db
    .select({
      videoUrlForDeletion: videos.videoUrlForDeletion,
      thumbnailUrlForDeletion: videos.thumbnailUrlForDeletion,
    })
    .from(videos)
    .where(and(eq(videos.id, Number(id)), eq(videos.userId, Number(userId))));

  if (!doesThisUserOwnThisVideo) {
    throw new Error("Video not found or unauthorized");
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

  // Delete from Cloudflare
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

  return {
    data: {
      success: true,
      message: "Video deleted successfully",
      deletedVideo,
      deletedLikes,
      deletedSaves,
      deleteComments,
    },
  };
};
