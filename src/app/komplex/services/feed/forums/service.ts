import { and, eq, desc, sql, inArray, ne } from "drizzle-orm";
import { db } from "@/db/index.js";
import { redis } from "@/db/redis/redisConfig.js";
import {
  forums,
  forumMedias,
  users,
  forumLikes,
  followers,
} from "@/db/schema.js";

export const getAllForums = async (
  type?: string,
  topic?: string,
  page?: string,
  userId?: number
) => {
  try {
    const conditions = [];
    if (type) conditions.push(eq(forums.type, type));
    if (topic) conditions.push(eq(forums.topic, topic));

    const pageNumber = Number(page) || 1;
    const limit = 20;
    const offset = (pageNumber - 1) * limit;

    // 1️⃣ Fetch filtered forum IDs from DB
    // Get forums from followed users
    const followedUsersForumIds = await db
      .select({ id: forums.id })
      .from(forums)
      .where(
        inArray(
          forums.userId,
          db
            .select({ followedId: followers.followedId })
            .from(followers)
            .where(eq(followers.userId, Number(userId)))
        )
      )
      .orderBy(
        desc(
          sql`CASE WHEN DATE(${forums.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END`
        ),
        desc(forums.viewCount),
        desc(forums.updatedAt)
      )
      .limit(5);

    // 1️⃣ Fetch filtered forum IDs from DB
    const forumIds = await db
      .select({ id: forums.id })
      .from(forums)
      .where(
        and(
          conditions.length > 0 ? and(...conditions) : undefined,
          // ne(forums.userId, Number(userId))
        )
      )
      .orderBy(
        desc(
          sql`CASE WHEN DATE(${forums.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END`
        ),
        desc(forums.viewCount),
        desc(forums.updatedAt)
      )
      .offset(offset)
      .limit(limit);

    const forumIdRows = Array.from(
      new Set([
        ...followedUsersForumIds.map((f) => f.id),
        ...forumIds.map((f) => f.id),
      ])
    ).map((id) => ({ id }));

    if (!forumIdRows.length) {
      return { data: [], hasMore: false };
    }

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
          profileImage: users.profileImage,
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
            profileImage: forum.profileImage,
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
        isLiked: sql`CASE WHEN ${forumLikes.forumId} IS NOT NULL THEN true ELSE false END`,
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
        isLiked: !!dynamic?.isLiked,
      };
    });

    return { data: forumsWithMedia, hasMore: allForums.length === limit };
  } catch (error) {
    throw new Error((error as Error).message);
  }
};
