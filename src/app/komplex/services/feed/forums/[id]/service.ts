import { db } from "@/db/index.js";
import {
  forums,
  forumMedias,
  users,
  forumLikes,
  followers,
} from "@/db/schema.js";
import { redis } from "@/db/redis/redisConfig.js";
import { eq, and, sql } from "drizzle-orm";

export const getForumById = async (id: string, userId: number) => {
  const cacheKey = `forums:${id}`;

  // Try Redis first (only static info)
  const cached = await redis.get(cacheKey);
  let forumData;
  if (cached) {
    forumData = JSON.parse(cached);
  } else {
    // Fetch forum static info
    const forum = await db
      .select({
        id: forums.id,
        userId: forums.userId,
        title: forums.title,
        description: forums.description,
        type: forums.type,
        topic: forums.topic,
        viewCount: forums.viewCount,
        createdAt: forums.createdAt,
        updatedAt: forums.updatedAt,
        mediaUrl: forumMedias.url,
        mediaType: forumMedias.mediaType,
        username: sql`${users.firstName} || ' ' || ${users.lastName}`,
        profileImage: users.profileImage,
      })
      .from(forums)
      .leftJoin(forumMedias, eq(forums.id, forumMedias.forumId))
      .leftJoin(users, eq(forums.userId, users.id))
      .where(eq(forums.id, Number(id)));

    if (!forum || forum.length === 0) {
      throw new Error("Forum not found");
    }

    // Build static cacheable object
    forumData = {
      id: forum[0].id,
      userId: forum[0].userId,
      title: forum[0].title,
      description: forum[0].description,
      type: forum[0].type,
      topic: forum[0].topic,
      createdAt: forum[0].createdAt,
      updatedAt: new Date(),
      username: forum[0].username,
      profileImage: forum[0].profileImage,
      media: forum
        .filter((f) => f.mediaUrl)
        .map((f) => ({
          url: f.mediaUrl,
          type: f.mediaType,
        })),
    };

    // Cache static data only
    await redis.set(cacheKey, JSON.stringify(forumData), {
      EX: 600,
    });
  }

  // Always increment view count on every request
  await db
    .update(forums)
    .set({
      viewCount: sql`${forums.viewCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(forums.id, Number(id)));

  // Always fetch dynamic fields fresh
  const dynamic = await db
    .select({
      viewCount: forums.viewCount,
      likeCount: sql`COUNT(DISTINCT ${forumLikes.id})`,
      isLiked: sql`CASE WHEN ${forumLikes.forumId} IS NOT NULL THEN true ELSE false END`,
      profileImage: users.profileImage,
    })
    .from(forums)
    .leftJoin(
      forumLikes,
      and(
        eq(forumLikes.forumId, forums.id),
        eq(forumLikes.userId, Number(userId))
      )
    )
    .leftJoin(users, eq(forums.userId, users.id))
    .where(eq(forums.id, Number(id)))
    .groupBy(forums.id, forumLikes.forumId, users.profileImage);

  const isFollowing = await db
    .select()
    .from(followers)
    .where(
      and(
        eq(followers.followedId, Number(forumData.userId)),
        eq(followers.userId, userId)
      )
    );

  const forumWithMedia = {
    ...forumData,
    isFollowing: isFollowing.length > 0,
    viewCount: dynamic[0]?.viewCount ?? 0, // Use the fresh viewCount from database
    likeCount: Number(dynamic[0]?.likeCount) || 0,
    isLiked: !!dynamic[0]?.isLiked,
    profileImage: dynamic[0]?.profileImage || forumData.profileImage,
  };

  return { data: forumWithMedia };
};
