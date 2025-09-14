import { and, eq, desc, sql } from "drizzle-orm";
import { db } from "@/db/index.js";
import { redis } from "@/db/redis/redisConfig.js";
import {
  forumComments,
  forumCommentMedias,
  users,
  forumCommentLikes,
} from "@/db/schema.js";

export const getAllCommentsForAForum = async (
  id: string,
  userId: number,
  page: number = 1
) => {
  const pageNumber = Number(page) || 1;
  const limit = 40;
  const offset = (pageNumber - 1) * limit;

  const cacheKey = `forumComments:forum:${id}:page:${pageNumber}`;
  const cached = await redis.get(cacheKey);

  let cachedComments: any[] = [];
  if (cached) {
    cachedComments = JSON.parse(cached);
    console.log("data from redis");
  }

  // --- Fetch dynamic fields fresh ---
  const dynamicData = await db
    .select({
      id: forumComments.id,
      likeCount: sql`COUNT(DISTINCT ${forumCommentLikes.forumCommentId})`,
      isLiked: sql`CASE WHEN ${forumCommentLikes.forumCommentId} IS NOT NULL THEN true ELSE false END`,
      profileImage: users.profileImage, // Add this line
    })
    .from(forumComments)
    .leftJoin(
      forumCommentLikes,
      and(
        eq(forumCommentLikes.forumCommentId, forumComments.id),
        eq(forumCommentLikes.userId, Number(userId))
      )
    )
    .leftJoin(users, eq(users.id, forumComments.userId)) // Add this join
    .where(eq(forumComments.forumId, Number(id)))
    .groupBy(
      forumComments.id,
      forumCommentLikes.forumCommentId,
      users.profileImage
    ) // Add users.profileImage to groupBy
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
        profileImage: users.profileImage,
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
        users.lastName,
        users.profileImage
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
            profileImage: comment.profileImage,
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
    await redis.set(cacheKey, JSON.stringify(cachedComments), { EX: 60 });
  }

  // Merge dynamic data with cached static data
  const commentsWithMedia = cachedComments.map((c) => {
    const dynamic = dynamicData.find((d) => d.id === c.id);
    return {
      ...c,
      likeCount: Number(dynamic?.likeCount) || 0,
      isLiked: !!dynamic?.isLiked,
      profileImage: dynamic?.profileImage || c.profileImage, // Ensure profileImage is included
    };
  });

  return {
    data: commentsWithMedia,
    hasMore: commentsWithMedia.length === limit,
  };
};
