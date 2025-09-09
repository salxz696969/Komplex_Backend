import { db } from "@/db/index.js";
import { videoReplies, videoReplyMedias, videoReplyLike } from "@/db/schema.js";
import { uploadVideoToCloudflare } from "@/db/cloudflare/cloudflareFunction.js";
import { redis } from "@/db/redis/redisConfig.js";
import { and, eq, inArray } from "drizzle-orm";
import { deleteFromCloudflare } from "@/db/cloudflare/cloudflareFunction.js";

export const updateVideoReply = async (
  id: string,
  userId: number,
  description: string,
  videosToRemove: any,
  files: any
) => {
  const [doesUserOwnThisReply] = await db
    .select()
    .from(videoReplies)
    .where(
      and(
        eq(videoReplies.id, Number(id)),
        eq(videoReplies.userId, Number(userId))
      )
    )
    .limit(1);

  if (!doesUserOwnThisReply) {
    throw new Error("Video reply not found");
  }

  let videosToRemoveParse: { url: string }[] = [];
  if (videosToRemove) {
    try {
      videosToRemoveParse =
        typeof videosToRemove === "string"
          ? JSON.parse(videosToRemove)
          : videosToRemove;
    } catch (err) {
      throw new Error("Invalid videosToRemove format");
    }
  }

  let newVideoReplyMedia: any[] = [];
  if (files) {
    for (const file of files as Express.Multer.File[]) {
      try {
        const uniqueKey = `${id}-${crypto.randomUUID()}-${file.originalname}`;
        const url = await uploadVideoToCloudflare(
          uniqueKey,
          file.buffer,
          file.mimetype
        );
        const [media] = await db
          .insert(videoReplyMedias)
          .values({
            videoReplyId: Number(id),
            url: url,
            urlForDeletion: uniqueKey,
            mediaType: file.mimetype.startsWith("video") ? "video" : "image",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        newVideoReplyMedia.push(media);
      } catch (error) {
        console.error("Error uploading file or saving media:", error);
      }
    }
  }

  let deleteMedia = null;
  if (videosToRemoveParse && videosToRemoveParse.length > 0) {
    const deleteResults = await Promise.all(
      videosToRemoveParse.map(async (mediaToRemove: any) => {
        const [urlForDeletion] = await db
          .select({ urlForDeletion: videoReplyMedias.urlForDeletion })
          .from(videoReplyMedias)
          .where(eq(videoReplyMedias.url, mediaToRemove.url));
        let deleted = null;
        if (urlForDeletion) {
          await deleteFromCloudflare(
            "komplex-image",
            urlForDeletion.urlForDeletion ?? ""
          );
          deleted = await db
            .delete(videoReplyMedias)
            .where(
              and(
                eq(videoReplyMedias.videoReplyId, Number(id)),
                eq(
                  videoReplyMedias.urlForDeletion,
                  urlForDeletion.urlForDeletion ?? ""
                )
              )
            )
            .returning();
        }
        return deleted;
      })
    );
    deleteMedia = deleteResults.flat();
  }

  const [updateReply] = await db
    .update(videoReplies)
    .set({
      description,
      updatedAt: new Date(),
    })
    .where(eq(videoReplies.id, Number(id)))
    .returning();

  const pattern = `videoReplies:comment:${updateReply.videoCommentId}:page:*`;
  let cursor = "0";

  do {
    const scanResult = await redis.scan(cursor, {
      MATCH: pattern,
      COUNT: 100,
    });
    cursor = scanResult.cursor;
    const keys = scanResult.keys;

    if (keys.length > 0) {
      await Promise.all(keys.map((k) => redis.del(k)));
    }
  } while (cursor !== "0");

  await redis.del(
    `videoReplies:comment:${updateReply.videoCommentId}:lastPage`
  );

  return {
    data: { updateReply, newVideoReplyMedia, deleteMedia },
  };
};

export const deleteVideoReply = async (id: string, userId: number) => {
  const [doesUserOwnThisReply] = await db
    .select()
    .from(videoReplies)
    .where(
      and(
        eq(videoReplies.id, Number(id)),
        eq(videoReplies.userId, Number(userId))
      )
    )
    .limit(1);

  if (!doesUserOwnThisReply) {
    throw new Error("Video reply not found");
  }

  const result = await deleteVideoReplyInternal(
    Number(userId),
    Number(id),
    null
  );

  return {
    data: {
      success: true,
      message: "Video reply deleted successfully",
      ...result,
    },
  };
};

export const deleteVideoReplyInternal = async (
  userId: number,
  videoReplyId: number | null,
  commentId: number | null
) => {
  if (videoReplyId === null && commentId === null) {
    throw new Error("Either videoReplyId or commentId must be provided");
  }

  if (videoReplyId && commentId === null) {
    const mediaToDelete = await db
      .select({ urlForDeletion: videoReplyMedias.urlForDeletion })
      .from(videoReplyMedias)
      .where(eq(videoReplyMedias.videoReplyId, videoReplyId));

    for (const media of mediaToDelete) {
      await deleteFromCloudflare("komplex-image", media.urlForDeletion ?? "");
    }

    const deletedMedia = await db
      .delete(videoReplyMedias)
      .where(eq(videoReplyMedias.videoReplyId, videoReplyId))
      .returning({
        url: videoReplyMedias.url,
        mediaType: videoReplyMedias.mediaType,
      });
    const deleteLikeReply = await db
      .delete(videoReplyLike)
      .where(eq(videoReplyLike.videoReplyId, videoReplyId))
      .returning();
    const deletedReply = await db
      .delete(videoReplies)
      .where(
        and(eq(videoReplies.id, videoReplyId), eq(videoReplies.userId, userId))
      )
      .returning();

    const pattern = `videoReplies:comment:${deletedReply[0]?.videoCommentId}:page:*`;
    let cursor = "0";
    do {
      const scanResult = await redis.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });
      cursor = scanResult.cursor;
      const keys = scanResult.keys;
      if (keys.length > 0) {
        await Promise.all(keys.map((k) => redis.del(k)));
      }
    } while (cursor !== "0");
    await redis.del(
      `videoReplies:comment:${deletedReply[0]?.videoCommentId}:lastPage`
    );

    return { deletedReply, deletedMedia, deleteLikeReply };
  }

  if (commentId && videoReplyId === null) {
    const getVideoReplyIdByCommentId = await db
      .select({ id: videoReplies.id })
      .from(videoReplies)
      .where(eq(videoReplies.videoCommentId, commentId));
    const videoReplyIds = getVideoReplyIdByCommentId.map((r) => r.id);

    const mediaToDelete = await db
      .select({ urlForDeletion: videoReplyMedias.urlForDeletion })
      .from(videoReplyMedias)
      .where(
        videoReplyIds.length > 0
          ? inArray(videoReplyMedias.videoReplyId, videoReplyIds)
          : eq(videoReplyMedias.videoReplyId, -1)
      );

    for (const media of mediaToDelete) {
      await deleteFromCloudflare("komplex-image", media.urlForDeletion ?? "");
    }

    const deletedMedia = await db
      .delete(videoReplyMedias)
      .where(
        videoReplyIds.length > 0
          ? inArray(videoReplyMedias.videoReplyId, videoReplyIds)
          : eq(videoReplyMedias.videoReplyId, -1)
      )
      .returning({
        url: videoReplyMedias.url,
        mediaType: videoReplyMedias.mediaType,
      });
    const deleteLikeReply = await db
      .delete(videoReplyLike)
      .where(
        videoReplyIds.length > 0
          ? inArray(videoReplyLike.videoReplyId, videoReplyIds)
          : eq(videoReplyLike.videoReplyId, -1)
      )
      .returning();
    const deletedReply = await db
      .delete(videoReplies)
      .where(
        videoReplyIds.length > 0
          ? inArray(videoReplies.id, videoReplyIds)
          : eq(videoReplies.id, -1)
      )
      .returning();

    const pattern = `videoReplies:comment:${commentId}:page:*`;
    let cursor = "0";
    do {
      const scanResult = await redis.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });
      cursor = scanResult.cursor;
      const keys = scanResult.keys;
      if (keys.length > 0) {
        await Promise.all(keys.map((k) => redis.del(k)));
      }
    } while (cursor !== "0");
    await redis.del(`videoReplies:comment:${commentId}:lastPage`);

    return { deletedReply, deletedMedia, deleteLikeReply };
  }
};

export const likeVideoReply = async (id: string, userId: number) => {
  try {
    const like = await db
      .insert(videoReplyLike)
      .values({
        userId: Number(userId),
        videoReplyId: Number(id),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return {
      data: {
        success: true,
        message: "Video reply liked successfully",
        like,
      },
    };
  } catch (error) {
    throw new Error((error as Error).message);
  }
};

export const unlikeVideoReply = async (id: string, userId: number) => {
  try {
    const unlike = await db
      .delete(videoReplyLike)
      .where(
        and(
          eq(videoReplyLike.userId, Number(userId)),
          eq(videoReplyLike.videoReplyId, Number(id))
        )
      )
      .returning();

    return {
      data: {
        success: true,
        message: "Video reply unliked successfully",
        unlike,
      },
    };
  } catch (error) {
    throw new Error((error as Error).message);
  }
};
