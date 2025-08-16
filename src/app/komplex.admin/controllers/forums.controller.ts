import { eq, and, inArray } from "drizzle-orm";
import {
  forumComments,
  forumLikes,
  forumMedias,
  forumReplies,
  forums,
} from "../../../db/schema";
import { db } from "../../../db/index";
import { Request, Response } from "express";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../../db/cloudinary/cloundinaryFunction";
import { forumCommentMedias } from "../../../db/models/forum_comment_media";
import { forumReplyMedias } from "../../../db/models/forum_reply_media";
import { sql } from "drizzle-orm";

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    // add other user properties if needed
  };
}

export const getAllForums = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { type, topic } = req.query;

    const conditions = [];
    if (type) conditions.push(eq(forums.type, type as string));
    if (topic) conditions.push(eq(forums.topic, topic as string));

    // Get forums with basic info
    const forumsQuery =
      conditions.length > 0
        ? db
            .select()
            .from(forums)
            .where(and(...conditions))
        : db.select().from(forums);

    const forumsData = await forumsQuery;

    // Process each forum to get related data
    const forumsWithDetails = await Promise.all(
      forumsData.map(async (forum) => {
        // Get media for this forum
        const media = await db
          .select({
            id: forumMedias.id,
            url: forumMedias.url,
            mediaType: forumMedias.mediaType,
          })
          .from(forumMedias)
          .where(eq(forumMedias.forumId, forum.id));

        // Get comment count
        const commentCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(forumComments)
          .where(eq(forumComments.forumId, forum.id));

        // Get reply count
        const replyCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(forumReplies)
          .leftJoin(
            forumComments,
            eq(forumComments.id, forumReplies.forumCommentId)
          )
          .where(eq(forumComments.forumId, forum.id));

        // Get like count
        const likeCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(forumLikes)
          .where(eq(forumLikes.forumId, forum.id));

        return {
          id: forum.id,
          title: forum.title,
          description: forum.description,
          type: forum.type,
          topic: forum.topic,
          viewCount: forum.viewCount,
          likeCount: likeCount[0]?.count || 0,
          commentCount: commentCount[0]?.count || 0,
          replyCount: replyCount[0]?.count || 0,
          createdAt: forum.createdAt,
          updatedAt: forum.updatedAt,
          media: media,
        };
      })
    );

    return res.status(200).json(forumsWithDetails);
  } catch (error) {
    console.error("Get all forums error:", error);
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const getForumById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const forum = await db
      .select()
      .from(forums)
      .where(eq(forums.id, Number(id)))
      .limit(1);

    if (!forum || forum.length === 0 || !forum[0]) {
      return res
        .status(404)
        .json({ success: false, message: "Forum not found" });
    } else {
      await db
        .update(forums)
        .set({
          viewCount: (forum[0]?.viewCount ?? 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(forums.id, Number(id)))
        .returning();
    }
    return res.json(forum).status(200);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const updateForum = async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.user ?? {};
  const getCorrectUser = await db
    .select()
    .from(forums)
    .where(eq(forums.userId, Number(userId)));
  if (!getCorrectUser || getCorrectUser.length === 0) {
    return res.status(404).json({ success: false, message: "Forum not found" });
  }
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
    try {
      const { title, description, type, topic } = req.body;
      const { id } = req.params;

      // Create the forum entry
      const insertedForums = await db
        .update(forums)
        .set({
          userId: Number(userId),
          title,
          description,
          type,
          topic,
          updatedAt: new Date(),
        })
        .where(eq(forums.id, Number(id)))
        .returning();
      const newForum = insertedForums[0];

      let newMedia = null;

      // Only create media entry if file exists
      if (public_url && mediaType) {
        const oldMediaUrl = await db
          .select()
          .from(forumMedias)
          .where(eq(forumMedias.forumId, newForum.id));
        if (oldMediaUrl && oldMediaUrl.length > 0) {
          await deleteFromCloudinary(
            oldMediaUrl[0].url ?? "",
            oldMediaUrl[0].mediaType ?? undefined
          );
        }
        newMedia = await db
          .update(forumMedias)
          .set({
            url: public_url,
            mediaType,
          })
          .where(eq(forumMedias.forumId, newForum.id))
          .returning();
      }

      return res.status(200).json({
        forum: newForum,
        media: newMedia,
      });
    } catch (error) {
      if (public_url) {
        await deleteFromCloudinary(public_url, mediaType ?? undefined);
      }
      return res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const deleteForum = async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.user ?? {};
  const getCorrectUser = await db
    .select()
    .from(forums)
    .where(eq(forums.userId, Number(userId)));
  if (!getCorrectUser || getCorrectUser.length === 0) {
    return res.status(404).json({ success: false, message: "Forum not found" });
  }
  try {
    const { id } = req.params;

    // Delete associated media
    const doesForumExist = await db
      .select()
      .from(forums)
      .where(eq(forums.id, Number(id)));
    if (doesForumExist.length > 0) {
      const doesCommentExist = await db
        .select()
        .from(forumComments)
        .where(eq(forumComments.forumId, Number(id)));
      const deletedCommentsId = doesCommentExist.map((comment) => comment.id);
      if (deletedCommentsId.length > 0) {
        await db
          .delete(forumReplies)
          .where(inArray(forumReplies.forumCommentId, deletedCommentsId))
          .returning();
      }
      await db
        .delete(forumComments)
        .where(inArray(forumComments.id, deletedCommentsId))
        .returning();
      await db
        .delete(forums)
        .where(eq(forums.id, Number(id)))
        .returning();
    } else {
      return res
        .status(404)
        .json({ success: false, message: "Forum not found" });
    }
    // 1. Get all media for the forum itself
    const mediaForum = await db
      .select()
      .from(forumMedias)
      .where(eq(forumMedias.forumId, Number(id)));

    // 2. Get all comments for this forum
    const comments = await db
      .select()
      .from(forumComments)
      .where(eq(forumComments.forumId, Number(id)));

    const commentIds = comments.map((c) => c.id);

    // 3. Get all media for comments (assuming forumCommentMedias is the comment media table)
    let mediaForumComment: Array<{
      id: number;
      forumCommentId: number | null;
      url: string | null;
      mediaType: "image" | "video" | null;
      createdAt: Date | null;
      updatedAt: Date | null;
    }> = [];
    if (commentIds.length > 0) {
      mediaForumComment = await db
        .select()
        .from(forumCommentMedias)
        .where(inArray(forumCommentMedias.forumCommentId, commentIds));
    }

    // 4. Get all replies for these comments
    let replies: Array<typeof forumReplies.$inferSelect> = [];
    if (commentIds.length > 0) {
      replies = await db
        .select()
        .from(forumReplies)
        .where(inArray(forumReplies.forumCommentId, commentIds));
    }

    const replyIds = replies.map((r) => r.id);

    // 5. Get all media for replies (assuming forumReplyMedias is the reply media table)
    let mediaForumReply: Array<{
      id: number;
      forumReplyId: number | null;
      url: string | null;
      mediaType: "image" | "video" | null;
      createdAt: Date | null;
      updatedAt: Date | null;
    }> = [];
    if (replyIds.length > 0) {
      mediaForumReply = await db
        .select()
        .from(forumReplyMedias)
        .where(inArray(forumReplyMedias.forumReplyId, replyIds));
    }

    // 6. Delete media files from Cloudinary and delete media rows

    // Delete forum media
    for (const m of mediaForum) {
      if (m.url) {
        await deleteFromCloudinary(m.url, m.mediaType ?? undefined);
      }
    }
    await db.delete(forumMedias).where(eq(forumMedias.forumId, Number(id)));

    // Delete comment media
    for (const m of mediaForumComment) {
      if (m.url) {
        await deleteFromCloudinary(m.url, m.mediaType ?? undefined);
      }
    }
    if (commentIds.length > 0) {
      await db
        .delete(forumCommentMedias)
        .where(inArray(forumCommentMedias.forumCommentId, commentIds));
    }

    // Delete reply media
    for (const m of mediaForumReply) {
      if (m.url) {
        await deleteFromCloudinary(m.url, m.mediaType ?? undefined);
      }
    }
    if (replyIds.length > 0) {
      await db
        .delete(forumReplyMedias)
        .where(inArray(forumReplyMedias.forumReplyId, replyIds));
    }

    return res
      .status(200)
      .json({ success: true, message: "Forum deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};
