import { eq, and, inArray, sql, desc } from "drizzle-orm";
import {
  forumComments,
  forumLikes,
  forumMedias,
  forumReplies,
  forums,
  users,
} from "@/db/schema.js";
import { db } from "@/db/index.js";
import { Request, Response } from "express";
import { forumCommentLikes } from "@/db/models/forum_comment_like.js";
import { forumCommentMedias } from "@/db/models/forum_comment_media.js";
import { redis } from "@/db/redis/redisConfig.js";
import { AuthenticatedRequest } from "@/types/request.js";

export const getAllCommentsForAForumController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };
    const { page } = req.query;
    const pageNumber = Number(page) || 1;
    const limit = 40;
    const offset = (pageNumber - 1) * limit;

    const cacheKey = `forumComments:forum:${id}:page:${pageNumber}`;
    const cached = await redis.get(cacheKey);

    let cachedComments: any[] = [];
    if (cached) {
      cachedComments = JSON.parse(cached).commentsWithMedia;
      console.log("data from redis");
    }

    // --- Fetch dynamic fields fresh ---
    const dynamicData = await db
      .select({
        id: forumComments.id,
        likeCount: sql`COUNT(DISTINCT ${forumCommentLikes.forumCommentId})`,
        isLike: sql`CASE WHEN ${forumCommentLikes.forumCommentId} IS NOT NULL THEN true ELSE false END`,
      })
      .from(forumComments)
      .leftJoin(
        forumCommentLikes,
        and(
          eq(forumCommentLikes.forumCommentId, forumComments.id),
          eq(forumCommentLikes.userId, Number(userId))
        )
      )
      .where(eq(forumComments.forumId, Number(id)))
      .groupBy(forumComments.id, forumCommentLikes.forumCommentId)
      .offset(offset)
      .limit(limit);

    // If no cache → query full comments and cache static part
    if (!cachedComments.length) {
      const commentRows = await db
        .select({
          id: forumComments.id,
          userId: forumComments.userId,
          forumId: forumComments.forumId,
          description: forumComments.description,
          createdAt: forumComments.createdAt,
          updatedAt: forumComments.updatedAt,
          mediaUrl: forumCommentMedias.url,
          mediaType: forumCommentMedias.mediaType,
          username: sql`${users.firstName} || ' ' || ${users.lastName}`,
        })
        .from(forumComments)
        .leftJoin(
          forumCommentMedias,
          eq(forumComments.id, forumCommentMedias.forumCommentId)
        )
        .leftJoin(users, eq(users.id, forumComments.userId))
        .leftJoin(
          forumCommentLikes,
          eq(forumComments.id, forumCommentLikes.forumCommentId)
        )
        .where(eq(forumComments.forumId, Number(id)))
        .groupBy(
          forumComments.id,
          forumComments.userId,
          forumComments.forumId,
          forumComments.description,
          forumComments.createdAt,
          forumComments.updatedAt,
          forumCommentMedias.url,
          forumCommentMedias.mediaType,
          users.firstName,
          users.lastName
        )
        .orderBy(
          desc(sql`COUNT(DISTINCT ${forumCommentLikes.id})`),
          desc(
            sql`CASE WHEN DATE(${forumComments.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END`
          ),
          desc(forumComments.updatedAt)
        )
        .offset(offset)
        .limit(limit);

      cachedComments = Object.values(
        commentRows.reduce((acc, comment) => {
          if (!acc[comment.id]) {
            acc[comment.id] = {
              id: comment.id,
              userId: comment.userId,
              forumId: comment.forumId,
              description: comment.description,
              createdAt: comment.createdAt,
              updatedAt: comment.updatedAt,
              media: [] as { url: string; type: string }[],
              username: comment.username,
            };
          }
          if (comment.mediaUrl) {
            acc[comment.id].media.push({
              url: comment.mediaUrl,
              type: comment.mediaType,
            });
          }
          return acc;
        }, {} as { [key: number]: any })
      );

      console.log("data from db");
      // Cache only static part
      await redis.set(
        cacheKey,
        JSON.stringify({ commentsWithMedia: cachedComments }),
        { EX: 60 }
      );
    }

    // Merge dynamic data with cached static data
    const commentsWithMedia = cachedComments.map((c) => {
      const dynamic = dynamicData.find((d) => d.id === c.id);
      return {
        ...c,
        likeCount: Number(dynamic?.likeCount) || 0,
        isLike: !!dynamic?.isLike,
      };
    });

    return res
      .status(200)
      .json({ commentsWithMedia, hasMore: commentsWithMedia.length === limit });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const likeForumCommentController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const like = await db
      .insert(forumCommentLikes)
      .values({
        userId: Number(userId),
        forumCommentId: Number(id),
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

export const unlikeForumCommentController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const unlike = await db
      .delete(forumCommentLikes)
      .where(
        and(
          eq(forumCommentLikes.userId, Number(userId)),
          eq(forumCommentLikes.forumCommentId, Number(id))
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
