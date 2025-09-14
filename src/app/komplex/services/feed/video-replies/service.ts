import { db } from "@/db/index.js";
import { users, videoReplies } from "@/db/schema.js";
import { videoReplyMedias } from "@/db/models/video_reply_medias.js";
import { videoReplyLike } from "@/db/models/video_reply_like.js";
import { redis } from "@/db/redis/redisConfig.js";
import { and, desc, eq, sql } from "drizzle-orm";

export const getAllVideoRepliesForAComment = async (
  id: string,
  userId: number,
  page: number = 1
) => {
  const pageNumber = Number(page) || 1;
  const limit = 20;
  const offset = (pageNumber - 1) * limit;

  const cacheKey = `videoReplies:comment:${id}:page:${pageNumber}`;
  const cached = await redis.get(cacheKey);

  let cachedReplies: any[] = [];
  if (cached) {
    cachedReplies = JSON.parse(cached);
  }

  // Fetch dynamic fields fresh
  const dynamicData = await db
    .select({
      id: videoReplies.id,
      likeCount: sql`COUNT(DISTINCT ${videoReplyLike.videoReplyId})`,
      isLiked: sql`CASE WHEN ${videoReplyLike.videoReplyId} IS NOT NULL THEN true ELSE false END`,
      profileImage: users.profileImage, // Add this line
    })
    .from(videoReplies)
    .leftJoin(
      videoReplyLike,
      and(eq(videoReplyLike.videoReplyId, videoReplies.id), eq(videoReplyLike.userId, userId))
    )
    .leftJoin(users, eq(users.id, videoReplies.userId)) // Add this join
    .where(eq(videoReplies.videoCommentId, Number(id)))
    .groupBy(videoReplies.id, videoReplyLike.videoReplyId, users.profileImage) // Add users.profileImage to groupBy
    .offset(offset)
    .limit(limit);

  if (!cachedReplies.length) {
    const replyRows = await db
      .select({
        id: videoReplies.id,
        userId: videoReplies.userId,
        videoCommentId: videoReplies.videoCommentId,
        description: videoReplies.description,
        createdAt: videoReplies.createdAt,
        updatedAt: videoReplies.updatedAt,
        mediaUrl: videoReplyMedias.url,
        mediaType: videoReplyMedias.mediaType,
        username: sql`${users.firstName} || ' ' || ${users.lastName}`,
        profileImage: users.profileImage,
      })
      .from(videoReplies)
      .leftJoin(
        videoReplyMedias,
        eq(videoReplies.id, videoReplyMedias.videoReplyId)
      )
      .leftJoin(users, eq(videoReplies.userId, users.id))
      .leftJoin(
        videoReplyLike,
        eq(videoReplies.id, videoReplyLike.videoReplyId)
      )
      .where(eq(videoReplies.videoCommentId, Number(id)))
      .groupBy(
        videoReplies.id,
        videoReplies.userId,
        videoReplies.videoCommentId,
        videoReplies.description,
        videoReplies.createdAt,
        videoReplies.updatedAt,
        videoReplyMedias.url,
        videoReplyMedias.mediaType,
        users.firstName,
        users.lastName,
        users.profileImage
      )
      .orderBy(
        desc(sql`COUNT(DISTINCT ${videoReplyLike.id})`),
        desc(
          sql`CASE WHEN DATE(${videoReplies.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END`
        ),
        desc(videoReplies.updatedAt)
      )
      .offset(offset)
      .limit(limit);

    cachedReplies = Object.values(
      replyRows.reduce((acc, reply) => {
        if (!acc[reply.id]) {
          acc[reply.id] = {
            id: reply.id,
            userId: reply.userId,
            videoCommentId: reply.videoCommentId,
            description: reply.description,
            createdAt: reply.createdAt,
            updatedAt: reply.updatedAt,
            media: [] as { url: string; type: string }[],
            username: reply.username,
            profileImage: reply.profileImage,
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

    await redis.set(cacheKey, JSON.stringify(cachedReplies), { EX: 60 });
  }

  const repliesWithMedia = cachedReplies.map((r) => {
    const dynamic = dynamicData.find((d) => d.id === r.id);
    return {
      ...r,
      likeCount: Number(dynamic?.likeCount) || 0,
      isLiked: !!dynamic?.isLiked,
      profileImage: dynamic?.profileImage || r.profileImage, // Ensure profileImage is included
    };
  });

  return {
    data: repliesWithMedia,
    hasMore: repliesWithMedia.length === limit,
  };
};
