import { and, eq, desc, sql, inArray } from "drizzle-orm";
import { db } from "@/db/index.js";
import { redis } from "@/db/redis/redisConfig.js";
import { forums, forumMedias, users, forumLikes } from "@/db/schema.js";

export const getAllForums = async (query: any, userId: number) => {
  const { type, topic, page } = query;
  const conditions = [];
  if (type) conditions.push(eq(forums.type, type as string));
  if (topic) conditions.push(eq(forums.topic, topic as string));

  const pageNumber = Number(page) || 1;
  const limit = 15;
  const offset = (pageNumber - 1) * limit;

  // 1️⃣ Fetch filtered forum IDs from DB
  const forumIdRows = await db
    .select({ id: forums.id })
    .from(forums)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(
      desc(
        sql`CASE WHEN DATE(${forums.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END`
      ),
      desc(forums.viewCount),
      desc(forums.updatedAt)
    )
    .offset(offset)
    .limit(limit);

  if (!forumIdRows.length)
    return { data: { forumsWithMedia: [], hasMore: false } };

  // 2️⃣ Fetch forums from Redis in one call
  const cachedResults = (await redis.mGet(
    forumIdRows.map((f) => `forums:${f.id}`)
  )) as (string | null)[];

  const hits: any[] = [];
  const missedIds: number[] = [];

  if (cachedResults.length > 0) {
    cachedResults.forEach((item, idx) => {
      if (item) hits.push(JSON.parse(item));
      else missedIds.push(forumIdRows[idx].id);
    });
  }

  // 3️⃣ Fetch missing forums from DB
  let missedForums: any[] = [];
  if (missedIds.length > 0) {
    const forumRows = await db
      .select({
        id: forums.id,
        userId: forums.userId,
        title: forums.title,
        description: forums.description,
        type: forums.type,
        topic: forums.topic,
        createdAt: forums.createdAt,
        updatedAt: forums.updatedAt,
        mediaUrl: forumMedias.url,
        mediaType: forumMedias.mediaType,
        username: sql`${users.firstName} || ' ' || ${users.lastName}`,
      })
      .from(forums)
      .leftJoin(forumMedias, eq(forums.id, forumMedias.forumId))
      .leftJoin(users, eq(forums.userId, users.id))
      .where(inArray(forums.id, missedIds));

    const forumMap = new Map<number, any>();
    for (const forum of forumRows) {
      if (!forumMap.has(forum.id)) {
        const formatted = {
          id: forum.id,
          userId: forum.userId,
          title: forum.title,
          description: forum.description,
          type: forum.type,
          topic: forum.topic,
          createdAt: forum.createdAt,
          updatedAt: forum.updatedAt,
          username: forum.username,
          media: [] as { url: string; type: string }[],
        };
        forumMap.set(forum.id, formatted);
        missedForums.push(formatted);
      }

      if (forum.mediaUrl) {
        forumMap.get(forum.id).media.push({
          url: forum.mediaUrl,
          type: forum.mediaType,
        });
      }
    }

    // Write missed forums to Redis
    for (const forum of missedForums) {
      await redis.set(`forums:${forum.id}`, JSON.stringify(forum), {
        EX: 600,
      });
    }
  }

  // 4️⃣ Merge hits and missed forums, preserving original order
  const allForumsMap = new Map<number, any>();
  for (const forum of [...hits, ...missedForums])
    allForumsMap.set(forum.id, forum);
  const allForums = forumIdRows.map((f) => allForumsMap.get(f.id));

  // 5️⃣ Fetch dynamic fields fresh
  const dynamicData = await db
    .select({
      id: forums.id,
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
    .where(
      inArray(
        forums.id,
        forumIdRows.map((f) => f.id)
      )
    )
    .groupBy(forums.id, forumLikes.forumId);

  const forumsWithMedia = allForums.map((f) => {
    const dynamic = dynamicData.find((d) => d.id === f.id);
    return {
      ...f,
      viewCount: (dynamic?.viewCount ?? 0) + 1,
      likeCount: Number(dynamic?.likeCount) || 0,
      isLike: !!dynamic?.isLike,
    };
  });

  return { data: { forumsWithMedia, hasMore: allForums.length === limit } };
};

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
