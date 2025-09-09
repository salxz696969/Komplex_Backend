import { db } from "@/db/index.js";
import {
  forumReplies,
  forumReplyLikes,
  forumReplyMedias,
  users,
} from "@/db/schema.js";
import { uploadImageToCloudflare } from "@/db/cloudflare/cloudflareFunction.js";
import { redis } from "@/db/redis/redisConfig.js";
import { and, eq, inArray } from "drizzle-orm";
import { deleteFromCloudflare } from "@/db/cloudflare/cloudflareFunction.js";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";

export const updateForumReply = async (
  id: string,
  body: any,
  files: any,
  userId: number
) => {
  const { description, photosToRemove } = body;

  const doesUserOwnThisReply = await db
    .select()
    .from(forumReplies)
    .where(
      and(
        eq(forumReplies.id, Number(id)),
        eq(forumReplies.userId, Number(userId))
      )
    )
    .limit(1);

  if (doesUserOwnThisReply.length === 0) {
    throw new Error("Reply not found");
  }

  let photosToRemoveParse: { url: string }[] = [];
  if (photosToRemove) {
    try {
      photosToRemoveParse = JSON.parse(photosToRemove);
    } catch (err) {
      throw new Error("Invalid photosToRemove format");
    }
  }

  let newReplyMedia: any[] = [];
  if (files) {
    for (const file of files as Express.Multer.File[]) {
      try {
        const uniqueKey = `${id}-${crypto.randomUUID()}-${file.originalname}`;
        const url = await uploadImageToCloudflare(
          uniqueKey,
          file.buffer,
          file.mimetype
        );
        const [media] = await db
          .insert(forumReplyMedias)
          .values({
            forumReplyId: Number(id),
            url: url,
            urlForDeletion: uniqueKey,
            mediaType: file.mimetype.startsWith("video") ? "video" : "image",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        newReplyMedia.push(media);
      } catch (error) {
        console.error("Error uploading file or saving media:", error);
      }
    }
  }

  let deleteMedia = null;
  if (photosToRemoveParse && photosToRemoveParse.length > 0) {
    const deleteResults = await Promise.all(
      photosToRemoveParse.map(async (photoToRemove: any) => {
        const urlForDeletion = await db
          .select({
            urlForDeletion: forumReplyMedias.urlForDeletion,
          })
          .from(forumReplyMedias)
          .where(eq(forumReplyMedias.url, photoToRemove.url));
        let deleted = null;
        if (urlForDeletion[0]?.urlForDeletion) {
          await deleteFromCloudflare(
            "komplex-image",
            urlForDeletion[0].urlForDeletion
          );
          deleted = await db
            .delete(forumReplyMedias)
            .where(
              and(
                eq(forumReplyMedias.forumReplyId, Number(id)),
                eq(
                  forumReplyMedias.urlForDeletion,
                  urlForDeletion[0].urlForDeletion
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
    .update(forumReplies)
    .set({
      description,
      updatedAt: new Date(),
    })
    .where(eq(forumReplies.id, Number(id)))
    .returning();

  const pattern = `forumReplies:comment:${updateReply.forumCommentId}:page:*`;
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
    `forumReplies:comment:${updateReply.forumCommentId}:lastPage`
  );

  return { data: { updateReply, newReplyMedia, deleteMedia } };
};

export const deleteForumReply = async (id: string, userId: number) => {
  const doesUserOwnThisReply = await db
    .select()
    .from(forumReplies)
    .where(
      and(
        eq(forumReplies.id, Number(id)),
        eq(forumReplies.userId, Number(userId))
      )
    )
    .limit(1);

  if (doesUserOwnThisReply.length === 0) {
    throw new Error("Reply not found");
  }
  const result = await deleteReply(Number(userId), Number(id), null);

  return {
    data: {
      success: true,
      message: "Reply deleted successfully",
      ...result,
    },
  };
};

export const deleteReply = async (
  userId: number,
  replyId: number | null,
  commentId: number | null
) => {
  if (replyId === null && commentId === null) {
    throw new Error("Either replyId or commentId must be provided");
  }

  // Delete by replyId
  if (replyId && commentId === null) {
    const mediasToDelete = await db
      .select({ urlForDeletion: forumReplyMedias.urlForDeletion })
      .from(forumReplyMedias)
      .where(eq(forumReplyMedias.forumReplyId, replyId));

    for (const media of mediasToDelete) {
      if (media.urlForDeletion) {
        await deleteFromCloudflare("komplex-image", media.urlForDeletion);
      }
    }

    const deletedMedia = await db
      .delete(forumReplyMedias)
      .where(eq(forumReplyMedias.forumReplyId, replyId))
      .returning({
        url: forumReplyMedias.url,
        mediaType: forumReplyMedias.mediaType,
      });

    const deletedLikes = await db
      .delete(forumReplyLikes)
      .where(eq(forumReplyLikes.forumReplyId, replyId))
      .returning();

    const deletedReply = await db
      .delete(forumReplies)
      .where(and(eq(forumReplies.id, replyId), eq(forumReplies.userId, userId)))
      .returning();

    const pattern = `forumReplies:comment:${deletedReply[0].forumCommentId}:page:*`;
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
      `forumReplies:comment:${deletedReply[0].forumCommentId}:lastPage`
    );

    return { deletedReply, deletedMedia, deletedLikes };
  }

  // Delete all replies for a commentId
  if (commentId && replyId === null) {
    const getReplyIdsByCommentId = await db
      .select({ id: forumReplies.id })
      .from(forumReplies)
      .where(eq(forumReplies.forumCommentId, commentId));
    const replyIds = getReplyIdsByCommentId.map((r) => r.id);

    const mediasToDelete = await db
      .select({ urlForDeletion: forumReplyMedias.urlForDeletion })
      .from(forumReplyMedias)
      .where(
        replyIds.length > 0
          ? inArray(forumReplyMedias.forumReplyId, replyIds)
          : eq(forumReplyMedias.forumReplyId, -1)
      );

    for (const media of mediasToDelete) {
      if (media.urlForDeletion) {
        await deleteFromCloudflare("komplex-image", media.urlForDeletion);
      }
    }

    const deletedMedia = await db
      .delete(forumReplyMedias)
      .where(
        replyIds.length > 0
          ? inArray(forumReplyMedias.forumReplyId, replyIds)
          : eq(forumReplyMedias.forumReplyId, -1)
      )
      .returning();

    const deletedLikes = await db
      .delete(forumReplyLikes)
      .where(
        replyIds.length > 0
          ? inArray(forumReplyLikes.forumReplyId, replyIds)
          : eq(forumReplyLikes.forumReplyId, -1)
      )
      .returning();

    const deletedReply = await db
      .delete(forumReplies)
      .where(
        replyIds.length > 0
          ? inArray(forumReplies.id, replyIds)
          : eq(forumReplies.id, -1)
      )
      .returning();

    const pattern = `forumReplies:comment:${commentId}:page:*`;
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

    await redis.del(`forumReplies:comment:${commentId}:lastPage`);

    return { deletedReply, deletedMedia, deletedLikes };
  }
};

export const likeForumReply = async (id: string, userId: number) => {
  try {
    const like = await db
      .insert(forumReplyLikes)
      .values({
        userId: Number(userId),
        forumReplyId: Number(id),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return {
      data: {
        success: true,
        message: "Forum reply liked successfully",
        like,
      },
    };
  } catch (error) {
    throw new Error((error as Error).message);
  }
};

export const unlikeForumReply = async (id: string, userId: number) => {
  try {
    const unlike = await db
      .delete(forumReplyLikes)
      .where(
        and(
          eq(forumReplyLikes.userId, Number(userId)),
          eq(forumReplyLikes.forumReplyId, Number(id))
        )
      )
      .returning();

    return {
      data: {
        success: true,
        message: "Forum reply unliked successfully",
        unlike,
      },
    };
  } catch (error) {
    throw new Error((error as Error).message);
  }
};
