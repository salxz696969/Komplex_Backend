import { db } from "@/db/index.js";
import { forums, forumMedias, users, forumLikes } from "@/db/schema.js";
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
        })
        .from(forums)
        .leftJoin(forumMedias, eq(forums.id, forumMedias.forumId))
        .leftJoin(users, eq(forums.userId, users.id))
        .where(eq(forums.id, Number(id)));
  
      if (!forum || forum.length === 0) {
        throw new Error("Forum not found");
      }
  
      // Increment view count
      await db
        .update(forums)
        .set({
          viewCount: (forum[0]?.viewCount ?? 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(forums.id, Number(id)));
  
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
        media: forum
          .filter((f) => f.mediaUrl)
          .map((f) => ({
            url: f.mediaUrl,
            type: f.mediaType,
          })),
      };
  
      // Cache static data only
      await redis.set(cacheKey, JSON.stringify({ forumWithMedia: forumData }), {
        EX: 600,
      });
    }
  
    // Always fetch dynamic fields fresh
    const dynamic = await db
      .select({
        viewCount: forums.viewCount,
        likeCount: sql`COUNT(DISTINCT ${forumLikes.id})`,
        isLike: sql`CASE WHEN ${forumLikes.forumId} IS NOT NULL THEN true ELSE false END`,
      })
      .from(forums)
      .leftJoin(
        forumLikes,
        and(
          eq(forumLikes.forumId, forums.id),
          eq(forumLikes.userId, Number(userId))
        )
      )
      .where(eq(forums.id, Number(id)))
      .groupBy(forums.id, forumLikes.forumId);
  
    const forumWithMedia = {
      ...forumData,
      viewCount: (dynamic[0]?.viewCount ?? 0) + 1,
      likeCount: Number(dynamic[0]?.likeCount) || 0,
      isLike: !!dynamic[0]?.isLike,
    };
  
    return { data: { forumWithMedia } };
  };