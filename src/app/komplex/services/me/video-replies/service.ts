import { db } from "@/db/index.js";
import { videoReplies, videoCommentMedias, videoCommentLike, videoComments } from "@/db/schema.js";
import { and, eq, inArray } from "drizzle-orm";
import { deleteVideoReply } from "@/app/komplex/controllers/feed/video_replies.controller.js";
import { deleteFromCloudflare } from "@/db/cloudflare/cloudflareFunction.js";
import { redis } from "@/db/redis/redisConfig.js";

export const deleteVideoCommentInternal = async (
  userId: number,
  commentId: number | null,
  videoId: number | null
) => {
  if (commentId === null && videoId === null) {
    throw new Error("Either commentId or videoId must be provided");
  }

  // Delete by commentId
  if (commentId && videoId === null) {
    const doesThisCommentHasReply = await db
      .select()
      .from(videoReplies)
      .where(eq(videoReplies.videoCommentId, Number(commentId)))
      .limit(1);

    let deleteReply = null;
    if (doesThisCommentHasReply.length > 0) {
      deleteReply = await deleteVideoReply(
        Number(userId),
        null,
        Number(commentId)
      );
    }

    const mediaToDelete = await db
      .select({ urlForDeletion: videoCommentMedias.urlForDeletion })
      .from(videoCommentMedias)
      .where(eq(videoCommentMedias.videoCommentId, commentId));

    for (const media of mediaToDelete) {
      await deleteFromCloudflare("komplex-image", media.urlForDeletion ?? "");
    }

    const deletedMedia = await db
      .delete(videoCommentMedias)
      .where(eq(videoCommentMedias.videoCommentId, commentId))
      .returning({
        url: videoCommentMedias.url,
        mediaType: videoCommentMedias.mediaType,
      });

    const deletedLikes = await db
      .delete(videoCommentLike)
      .where(eq(videoCommentLike.videoCommentId, commentId))
      .returning();

    const deletedComment = await db
      .delete(videoComments)
      .where(
        and(eq(videoComments.id, commentId), eq(videoComments.userId, userId))
      )
      .returning();

    const pattern = `videoComments:video:${deletedComment[0].videoId}:page:*`;
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
      `videoComments:video:${deletedComment[0].videoId}:lastPage`
    );

    return { deletedComment, deletedMedia, deletedLikes, deleteReply };
  }

  // Delete all comments for a videoId
  if (videoId && commentId === null) {
    const getCommentIdsByVideoId = await db
      .select({ id: videoComments.id })
      .from(videoComments)
      .where(eq(videoComments.videoId, videoId));
    const commentIds = getCommentIdsByVideoId.map((c) => c.id);

    const mediaToDelete = await db
      .select({ urlForDeletion: videoCommentMedias.urlForDeletion })
      .from(videoCommentMedias)
      .where(
        commentIds.length > 0
          ? inArray(videoCommentMedias.videoCommentId, commentIds)
          : eq(videoCommentMedias.videoCommentId, -1)
      );

    for (const media of mediaToDelete) {
      await deleteFromCloudflare("komplex-image", media.urlForDeletion ?? "");
    }

    const deletedMedia = await db
      .delete(videoCommentMedias)
      .where(
        commentIds.length > 0
          ? inArray(videoCommentMedias.videoCommentId, commentIds)
          : eq(videoCommentMedias.videoCommentId, -1)
      )
      .returning({
        url: videoCommentMedias.url,
        mediaType: videoCommentMedias.mediaType,
      });

    const deletedLikes = await db
      .delete(videoCommentLike)
      .where(
        commentIds.length > 0
          ? inArray(videoCommentLike.videoCommentId, commentIds)
          : eq(videoCommentLike.videoCommentId, -1)
      )
      .returning();

    const deletedComment = await db
      .delete(videoComments)
      .where(
        commentIds.length > 0
          ? inArray(videoComments.id, commentIds)
          : eq(videoComments.id, -1)
      )
      .returning();

    const pattern = `videoComments:video:${deletedComment[0].videoId}:page:*`;
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
      `videoComments:video:${deletedComment[0].videoId}:lastPage`
    );

    return { deletedComment, deletedMedia, deletedLikes };
  }
};
