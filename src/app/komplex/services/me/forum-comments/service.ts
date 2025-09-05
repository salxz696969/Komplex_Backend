import { db } from "@/db/index.js";
import {
  forumComments,
  forumCommentMedias,
  forumCommentLikes,
  forumReplies,
} from "@/db/schema.js";
import { AuthenticatedRequest } from "@/types/request.js";
import { Response } from "express";
import { uploadImageToCloudflare } from "@/db/cloudflare/cloudflareFunction.js";
import { redis } from "@/db/redis/redisConfig.js";
import { and, eq, inArray } from "drizzle-orm";
import { deleteFromCloudflare } from "@/db/cloudflare/cloudflareFunction.js";
import { deleteReply } from "../forum-replies/[id]/service.js";

export const updateForumComment = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: "1" };
    const { id } = req.params;
    const { description, photosToRemove } = req.body;

    const doesUserOwnThisComment = await db
      .select()
      .from(forumComments)
      .where(
        and(
          eq(forumComments.id, Number(id)),
          eq(forumComments.userId, Number(userId))
        )
      )
      .limit(1);

    if (doesUserOwnThisComment.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }

    let photosToRemoveParse: { url: string }[] = [];
    if (photosToRemove) {
      try {
        photosToRemoveParse = JSON.parse(photosToRemove);
      } catch (err) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid photosToRemove format" });
      }
    }

    let newCommentMedia: any[] = [];
    if (req.files) {
      for (const file of req.files as Express.Multer.File[]) {
        try {
          const uniqueKey = `${id}-${crypto.randomUUID()}-${file.originalname}`;
          const url = await uploadImageToCloudflare(
            uniqueKey,
            file.buffer,
            file.mimetype
          );
          const [media] = await db
            .insert(forumCommentMedias)
            .values({
              forumCommentId: Number(id),
              url: url,
              urlForDeletion: uniqueKey,
              mediaType: file.mimetype.startsWith("video") ? "video" : "image",
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();
          newCommentMedia.push(media);
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
              urlForDeletion: forumCommentMedias.urlForDeletion,
            })
            .from(forumCommentMedias)
            .where(eq(forumCommentMedias.url, photoToRemove.url));
          let deleted = null;
          if (urlForDeletion[0]?.urlForDeletion) {
            await deleteFromCloudflare(
              "komplex-image",
              urlForDeletion[0].urlForDeletion
            );
            deleted = await db
              .delete(forumCommentMedias)
              .where(
                and(
                  eq(forumCommentMedias.forumCommentId, Number(id)),
                  eq(
                    forumCommentMedias.urlForDeletion,
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

    const [updateComment] = await db
      .update(forumComments)
      .set({
        description,
        updatedAt: new Date(),
      })
      .where(eq(forumComments.id, Number(id)))
      .returning();

    const pattern = `forumComments:forum:${updateComment.forumId}:page:*`;
    let cursor = "0";

    do {
      const scanResult = await redis.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });
      cursor = scanResult.cursor;
      const keys = scanResult.keys;

      if (keys.length > 0) {
        // delete each key individually
        await Promise.all(keys.map((k) => redis.del(k)));
      }
    } while (cursor !== "0");

    // Optionally delete the lastPage tracker
    await redis.del(`forumComments:forum:${updateComment.forumId}:lastPage`);

    return res
      .status(200)
      .json({ updateComment, newCommentMedia, deleteMedia });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const deleteForumComment = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: "1" };
    const { id } = req.params; // id = commentId

    const doesUserOwnThisComment = await db
      .select()
      .from(forumComments)
      .where(
        and(
          eq(forumComments.id, Number(id)),
          eq(forumComments.userId, Number(userId))
        )
      )
      .limit(1);

    if (doesUserOwnThisComment.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }

    const doesThisCommentHasReply = await db
      .select()
      .from(forumReplies)
      .where(eq(forumReplies.forumCommentId, Number(id)));
    let replyResults = null;
    if (doesThisCommentHasReply.length > 0) {
      replyResults = await deleteReply(Number(userId), null, Number(id));
    }
    const commentResults = await deleteComment(
      Number(userId),
      Number(id),
      null
    );

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
      replyResults,
      commentResults,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const deleteComment = async (
  userId: number,
  commentId: number | null,
  forumId: number | null
) => {
  if (commentId === null && forumId === null) {
    throw new Error("Either commentId or forumId must be provided");
  }

  // Delete by commentId
  if (commentId && forumId === null) {
    const mediasToDelete = await db
      .select({ urlForDeletion: forumCommentMedias.urlForDeletion })
      .from(forumCommentMedias)
      .where(eq(forumCommentMedias.forumCommentId, commentId));

    for (const media of mediasToDelete) {
      if (media.urlForDeletion) {
        await deleteFromCloudflare("komplex-image", media.urlForDeletion);
      }
    }

    const deletedMedia = await db
      .delete(forumCommentMedias)
      .where(eq(forumCommentMedias.forumCommentId, commentId))
      .returning({
        url: forumCommentMedias.url,
        mediaType: forumCommentMedias.mediaType,
      });

    const deletedLikes = await db
      .delete(forumCommentLikes)
      .where(eq(forumCommentLikes.forumCommentId, commentId))
      .returning();

    const deletedComment = await db
      .delete(forumComments)
      .where(
        and(eq(forumComments.id, commentId), eq(forumComments.userId, userId))
      )
      .returning();

    const pattern = `forumComments:forum:${deletedComment[0].forumId}:page:*`;
    let cursor = "0";

    do {
      const scanResult = await redis.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });
      cursor = scanResult.cursor;
      const keys = scanResult.keys;

      if (keys.length > 0) {
        // delete each key individually
        await Promise.all(keys.map((k) => redis.del(k)));
      }
    } while (cursor !== "0");

    // Optionally delete the lastPage tracker
    await redis.del(
      `forumComments:forum:${deletedComment[0].forumId}:lastPage`
    );

    return { deletedComment, deletedMedia, deletedLikes };
  }

  // Delete all comments for a forumId
  if (forumId && commentId === null) {
    const getCommentIdsByForumId = await db
      .select({ id: forumComments.id })
      .from(forumComments)
      .where(eq(forumComments.forumId, forumId));
    const commentIds = getCommentIdsByForumId.map((c) => c.id);

    // First, select all medias to delete from the cloud
    const mediasToDelete = await db
      .select({ urlForDeletion: forumCommentMedias.urlForDeletion })
      .from(forumCommentMedias)
      .where(
        commentIds.length > 0
          ? inArray(forumCommentMedias.forumCommentId, commentIds)
          : eq(forumCommentMedias.forumCommentId, -1)
      );

    for (const media of mediasToDelete) {
      if (media.urlForDeletion) {
        await deleteFromCloudflare("komplex-image", media.urlForDeletion);
      }
    }

    // Then, delete from the database
    const deletedMedia = await db
      .delete(forumCommentMedias)
      .where(
        commentIds.length > 0
          ? inArray(forumCommentMedias.forumCommentId, commentIds)
          : eq(forumCommentMedias.forumCommentId, -1)
      )
      .returning();

    const deletedLikes = await db
      .delete(forumCommentLikes)
      .where(
        commentIds.length > 0
          ? inArray(forumCommentLikes.forumCommentId, commentIds)
          : eq(forumCommentLikes.forumCommentId, -1)
      )
      .returning();

    const deletedComment = await db
      .delete(forumComments)
      .where(
        commentIds.length > 0
          ? inArray(forumComments.id, commentIds)
          : eq(forumComments.id, -1)
      )
      .returning();

    const pattern = `forumComments:forum:${deletedComment[0].forumId}:page:*`;
    let cursor = "0";

    do {
      const scanResult = await redis.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });
      cursor = scanResult.cursor;
      const keys = scanResult.keys;

      if (keys.length > 0) {
        // delete each key individually
        await Promise.all(keys.map((k) => redis.del(k)));
      }
    } while (cursor !== "0");

    // Optionally delete the lastPage tracker
    await redis.del(
      `forumComments:forum:${deletedComment[0].forumId}:lastPage`
    );

    return { deletedComment, deletedMedia, deletedLikes };
  }
};
