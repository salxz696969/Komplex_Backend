import { db } from "@/db/index.js";
import {
  videoComments,
  videoCommentMedias,
  videoCommentLike,
  videoReplies,
  users,
} from "@/db/schema.js";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { deleteFromCloudflare } from "@/db/cloudflare/cloudflareFunction.js";
import { redis } from "@/db/redis/redisConfig.js";

export const getAllVideoCommentsForAVideo = async (
  id: string,
  userId: number,
  page: number = 1
) => {
  const pageNumber = Number(page) || 1;
  const limit = 20;
  const offset = (pageNumber - 1) * limit;

  const cacheKey = `videoComments:video:${id}:page:${pageNumber}`;
  const cached = await redis.get(cacheKey);

  let cachedComments: any[] = [];
  if (cached) {
    cachedComments = JSON.parse(cached);
  }

  // --- Fetch dynamic fields fresh ---
  const dynamicData = await db
    .select({
      id: videoComments.id,
      likeCount: sql`COUNT(DISTINCT ${videoCommentLike.videoCommentId})`,
      isLike: sql`CASE WHEN ${videoCommentLike.videoCommentId} IS NOT NULL THEN true ELSE false END`,
    })
    .from(videoComments)
    .leftJoin(
      videoCommentLike,
      and(
        eq(videoCommentLike.videoCommentId, videoComments.id),
        eq(videoCommentLike.userId, Number(userId))
      )
    )
    .where(eq(videoComments.videoId, Number(id)))
    .groupBy(videoComments.id, videoCommentLike.videoCommentId)
    .offset(offset)
    .limit(limit);

  // If no cache → query full comments and cache static part
  if (!cachedComments.length) {
    const commentRows = await db
      .select({
        id: videoComments.id,
        userId: videoComments.userId,
        videoId: videoComments.videoId,
        description: videoComments.description,
        createdAt: videoComments.createdAt,
        updatedAt: videoComments.updatedAt,
        mediaUrl: videoCommentMedias.url,
        mediaType: videoCommentMedias.mediaType,
        username: sql`${users.firstName} || ' ' || ${users.lastName}`,
      })
      .from(videoComments)
      .leftJoin(
        videoCommentMedias,
        eq(videoComments.id, videoCommentMedias.videoCommentId)
      )
      .leftJoin(users, eq(users.id, videoComments.userId))
      .leftJoin(
        videoCommentLike,
        eq(videoComments.id, videoCommentLike.videoCommentId)
      )
      .where(eq(videoComments.videoId, Number(id)))
      .groupBy(
        videoComments.id,
        videoComments.userId,
        videoComments.videoId,
        videoComments.description,
        videoComments.createdAt,
        videoComments.updatedAt,
        videoCommentMedias.url,
        videoCommentMedias.mediaType,
        users.firstName,
        users.lastName
      )
      .orderBy(
        desc(sql`COUNT(DISTINCT ${videoCommentLike.id})`),
        desc(
          sql`CASE WHEN DATE(${videoComments.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END`
        ),
        desc(videoComments.updatedAt)
      )
      .offset(offset)
      .limit(limit);

    cachedComments = Object.values(
      commentRows.reduce((acc, comment) => {
        if (!acc[comment.id]) {
          acc[comment.id] = {
            id: comment.id,
            userId: comment.userId,
            videoId: comment.videoId,
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

    await redis.set(
      cacheKey,
      JSON.stringify( cachedComments ),
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

  return {
    data: commentsWithMedia,
    hasMore: commentsWithMedia.length === limit,
  };
};
