import { eq, and, inArray } from "drizzle-orm";
import {
  forumComments,
  forumLikes,
  forumMedias,
  forumReplies,
  forums,
} from "../../../db/schema.js";
import { db } from "../../../db/index.js";
import { Request, Response } from "express";
import {
  deleteFromCloudflare,
  uploadImageToCloudflare,
} from "../../../db/cloudflare/cloudflareFunction.js";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../../db/cloudinary/cloundinaryFunction.js";
import { forumCommentLikes } from "../../../db/models/forum_comment_like.js";
import { forumReplyLikes } from "../../../db/models/forum_reply_like.js";
import { forumReplyMedias } from "../../../db/models/forum_reply_media.js";
import { AuthenticatedRequest } from "../../../types/request.js";

export const getAllRepliesForAComment = async (req: Request, res: Response) => {
  try {
    const { forumCommentId } = req.params;

    const replies = await db
      .select()
      .from(forumReplies)
      .where(eq(forumReplies.forumCommentId, Number(forumCommentId)));

    return res.json(replies).status(200);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const postForumReply = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    let public_url: string | null = null;
    let mediaType: "image" | "video" | null = null;

    // If a file is uploaded, upload to Cloudinary
    if (req.file) {
      const result = (await uploadToCloudinary(
        req.file.buffer,
        "my_app_uploads",
        "auto"
      )) as {
        public_url: string;
      };
      public_url = result.public_url;
      mediaType = req.file.mimetype.startsWith("video") ? "video" : "image";
    }
    const { userId } = req.user ?? {};
    const { description, forumCommentId } = req.body;

    // Create the forum entry
    const insertedForumReply = await db
      .insert(forumReplies)
      .values({
        userId: Number(userId),
        forumCommentId: Number(forumCommentId),
        description,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (public_url) {
      await db.insert(forumReplyMedias).values({
        forumReplyId: insertedForumReply[0].id,
        url: public_url,
        mediaType,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return res.status(201).json({
      forum: insertedForumReply[0],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const likeForumCommentReply = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.body;
    const { userId } = req.user ?? {};

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    await db.insert(forumReplyLikes).values({
      userId: Number(userId),
      forumReplyId: Number(id),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res
      .status(200)
      .json({ success: true, message: "Forum liked successfully" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const unlikeForumCommentReply = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.body;
    const { userId } = req.user ?? {};

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    await db
      .delete(forumReplyLikes)
      .where(
        and(
          eq(forumReplyLikes.userId, Number(userId)),
          eq(forumReplyLikes.forumReplyId, Number(id))
        )
      )
      .returning();

    return res
      .json({ success: true, message: "Forum unliked successfully" })
      .status(200);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const updateForumReply = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;
    const { description, photosToRemove } = req.body;

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
      return res
        .status(404)
        .json({ success: false, message: "Reply not found" });
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

    let newReplyMedia: any[] = [];
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

    return res.status(200).json({ updateReply, newReplyMedia, deleteMedia });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const deleteForumReply = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;

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
      return res
        .status(404)
        .json({ success: false, message: "Reply not found" });
    }
    const result = await deleteReply(Number(userId), Number(id), null);

    return res.status(200).json({
      success: true,
      message: "Reply deleted successfully",
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
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
    // Select all medias to delete from Cloudflare
    const mediasToDelete = await db
      .select({ urlForDeletion: forumReplyMedias.urlForDeletion })
      .from(forumReplyMedias)
      .where(eq(forumReplyMedias.forumReplyId, replyId));

    for (const media of mediasToDelete) {
      if (media.urlForDeletion) {
        await deleteFromCloudflare("komplex-image", media.urlForDeletion);
      }
    }

    // Delete from database
    const deletedMedia = await db
      .delete(forumReplyMedias)
      .where(eq(forumReplyMedias.forumReplyId, replyId))
      .returning({
        url: forumReplyMedias.url,
        mediaType: forumReplyMedias.mediaType,
      });

    const deletedReply = await db
      .delete(forumReplies)
      .where(and(eq(forumReplies.id, replyId), eq(forumReplies.userId, userId)))
      .returning();

    return { deletedReply, deletedMedia };
  }

  // Delete all replies for a commentId
  if (commentId && replyId === null) {
    const getReplyIdsByCommentId = await db
      .select({ id: forumReplies.id })
      .from(forumReplies)
      .where(eq(forumReplies.forumCommentId, commentId));
    const replyIds = getReplyIdsByCommentId.map((r) => r.id);

    // Select all medias to delete from Cloudflare
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

    // Delete from database
    const deletedMedia = await db
      .delete(forumReplyMedias)
      .where(
        replyIds.length > 0
          ? inArray(forumReplyMedias.forumReplyId, replyIds)
          : eq(forumReplyMedias.forumReplyId, -1)
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

    return { deletedReply, deletedMedia };
  }
};
