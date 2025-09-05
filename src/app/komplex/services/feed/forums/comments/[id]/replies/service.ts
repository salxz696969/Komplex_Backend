import { Response } from "express";
import { and, eq, desc, sql } from "drizzle-orm";
import { db } from "@/db/index.js";
import { redis } from "@/db/redis/redisConfig.js";
import {
  forumReplies,
  forumReplyMedias,
  users,
  forumReplyLikes,
} from "@/db/schema.js";
import { AuthenticatedRequest } from "@/types/request.js";

export const getAllRepliesForAComment = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };
    const { page } = req.query;
    const pageNumber = Number(page) || 1;
    const limit = 20;
    const offset = (pageNumber - 1) * limit;

    const cacheKey = `forumReplies:comment:${id}:page:${pageNumber}`;
    const cached = await redis.get(cacheKey);

    let cachedReplies: any[] = [];
    if (cached) {
      cachedReplies = JSON.parse(cached).repliesWithMedia;
      console.log("data from redis");
    }

    // --- Fetch dynamic fields fresh ---
    const dynamicData = await db
      .select({
        id: forumReplies.id,
        likeCount: sql`COUNT(DISTINCT ${forumReplyLikes.forumReplyId})`,
        isLike: sql`CASE WHEN ${forumReplyLikes.forumReplyId} IS NOT NULL THEN true ELSE false END`,
      })
      .from(forumReplies)
      .leftJoin(
        forumReplyLikes,
        and(
          eq(forumReplyLikes.forumReplyId, forumReplies.id),
          eq(forumReplyLikes.userId, Number(userId))
        )
      )
      .where(eq(forumReplies.forumCommentId, Number(id)))
      .groupBy(forumReplies.id, forumReplyLikes.forumReplyId)
      .offset(offset)
      .limit(limit);

    // If no cache → query full replies and cache static part
    if (!cachedReplies.length) {
      const replyRows = await db
        .select({
          id: forumReplies.id,
          userId: forumReplies.userId,
          forumCommentId: forumReplies.forumCommentId,
          description: forumReplies.description,
          createdAt: forumReplies.createdAt,
          updatedAt: forumReplies.updatedAt,
          mediaUrl: forumReplyMedias.url,
          mediaType: forumReplyMedias.mediaType,
          username: sql`${users.firstName} || ' ' || ${users.lastName}`,
        })
        .from(forumReplies)
        .leftJoin(
          forumReplyMedias,
          eq(forumReplies.id, forumReplyMedias.forumReplyId)
        )
        .leftJoin(users, eq(users.id, forumReplies.userId))
        .leftJoin(
          forumReplyLikes,
          eq(forumReplies.id, forumReplyLikes.forumReplyId)
        )
        .where(eq(forumReplies.forumCommentId, Number(id)))
        .groupBy(
          forumReplies.id,
          forumReplies.userId,
          forumReplies.forumCommentId,
          forumReplies.description,
          forumReplies.createdAt,
          forumReplies.updatedAt,
          forumReplyMedias.url,
          forumReplyMedias.mediaType,
          users.firstName,
          users.lastName
        )
        .orderBy(
          desc(sql`COUNT(DISTINCT ${forumReplyLikes.id})`),
          desc(
            sql`CASE WHEN DATE(${forumReplies.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END`
          ),
          desc(forumReplies.updatedAt)
        )
        .offset(offset)
        .limit(limit);

      cachedReplies = Object.values(
        replyRows.reduce((acc, reply) => {
          if (!acc[reply.id]) {
            acc[reply.id] = {
              id: reply.id,
              userId: reply.userId,
              forumCommentId: reply.forumCommentId,
              description: reply.description,
              createdAt: reply.createdAt,
              updatedAt: reply.updatedAt,
              media: [] as { url: string; type: string }[],
              username: reply.username,
            };
          }
          if (reply.mediaUrl) {
            acc[reply.id].media.push({
              url: reply.mediaUrl,
              type: reply.mediaType,
            });
          }
          return acc;
        }, {} as { [key: number]: any })
      );

      console.log("data from db");
      // Cache only static part
      await redis.set(
        cacheKey,
        JSON.stringify({ repliesWithMedia: cachedReplies }),
        { EX: 60 }
      );
    }

    // Merge dynamic data with cached static data
    const repliesWithMedia = cachedReplies.map((r) => {
      const dynamic = dynamicData.find((d) => d.id === r.id);
      return {
        ...r,
        likeCount: Number(dynamic?.likeCount) || 0,
        isLike: !!dynamic?.isLike,
      };
    });

    return res
      .status(200)
      .json({ repliesWithMedia, hasMore: repliesWithMedia.length === limit });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};
