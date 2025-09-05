import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/index.js";
import {
  videos,
  users,
  userSavedVideos,
  videoLikes,
  userVideoHistory,
} from "@/db/schema.js";

export const getVideoById = async (videoId: number, userId: number) => {
  if (!videoId) {
    throw new Error("Missing video id");
  }

  const [videoRow] = await db
    .select({
      id: videos.id,
      userId: videos.userId,
      title: videos.title,
      description: videos.description,
      duration: videos.duration,
      videoUrl: videos.videoUrl,
      thumbnailUrl: videos.thumbnailUrl,
      videoUrlForDeletion: videos.videoUrlForDeletion,
      thumbnailUrlForDeletion: videos.thumbnailUrlForDeletion,
      viewCount: videos.viewCount,
      createdAt: videos.createdAt,
      updatedAt: videos.updatedAt,
      username: sql`${users.firstName} || ' ' || ${users.lastName}`,
      isSave: sql`CASE WHEN ${userSavedVideos.videoId} IS NOT NULL THEN true ELSE false END`,
      isLike: sql`CASE WHEN ${videoLikes.videoId} IS NOT NULL THEN true ELSE false END`,
      likeCount: sql`COUNT(DISTINCT ${videoLikes.id})`,
      saveCount: sql`COUNT(DISTINCT ${userSavedVideos.id})`,
    })
    .from(videos)
    .leftJoin(users, eq(videos.userId, users.id))
    .leftJoin(
      userSavedVideos,
      and(
        eq(userSavedVideos.videoId, videos.id),
        eq(userSavedVideos.userId, Number(userId))
      )
    )
    .leftJoin(
      videoLikes,
      and(
        eq(videoLikes.videoId, videos.id),
        eq(videoLikes.userId, Number(userId))
      )
    )
    .where(eq(videos.id, videoId))
    .groupBy(
      videos.id,
      users.firstName,
      users.lastName,
      userSavedVideos.videoId,
      videoLikes.videoId,
      userSavedVideos.id,
      videoLikes.id
    );

  if (!videoRow) {
    throw new Error("Video not found");
  }

  // increment view count
  await db
    .update(videos)
    .set({
      viewCount: (videoRow.viewCount ?? 0) + 1,
    })
    .where(eq(videos.id, videoId));

  // insert into history
  await db.insert(userVideoHistory).values({
    userId: Number(userId),
    videoId: videoId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { data: videoRow };
};

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
