import { db } from "@/db/index.js";
import { forumMedias } from "@/db/models/forum_medias.js";
import { forums } from "@/db/models/forums.js";
import { redis } from "@/db/redis/redisConfig.js";
import { followers, forumLikes, users } from "@/db/schema.js";
import { meilisearch } from "@/config/meilisearchConfig.js";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

export const searchForumsService = async (query: string, limit: number, offset: number, userId: number) => {
	try {
		const searchResults = await meilisearch.index("forums").search(query, {
			limit,
			offset,
		});
		let idsFromSearch = searchResults.hits.map((hit: any) => hit.id);
		if (searchResults.hits.length === 0) {
			const followedUsersForumsId = await db
				.select({ id: forums.id, userId: forums.userId })
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
					desc(sql`CASE WHEN DATE(${forums.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END`),
					desc(forums.updatedAt)
				)
				.limit(5);

			// 1️⃣ Fetch filtered forum IDs from DB (including your own forums) might change to other user's forums only in the future
			const forumIds = await db
				.select({ id: forums.id, userId: forums.userId })
				.from(forums)
				.orderBy(
					desc(sql`CASE WHEN DATE(${forums.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END`),
					desc(forums.updatedAt)
				)
				.offset(offset)
				.limit(limit);

			idsFromSearch = Array.from(
				Array.from(new Set([...followedUsersForumsId.map((f) => f.id), ...forumIds.map((f) => f.id)]))
			);
		}
		const cachedResults = (await redis.mGet(idsFromSearch.map((id) => `forums:${id}`))) as (string | null)[];

		const hits: any[] = [];
		const missedIds: number[] = [];

		if (cachedResults.length > 0) {
			cachedResults.forEach((item, idx) => {
				if (item) hits.push(JSON.parse(item));
				else missedIds.push(idsFromSearch[idx]);
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
		for (const forum of [...hits, ...missedForums]) {
			allForumsMap.set(forum.id, forum);
		}

		// Make sure idsFromSearch contains actual IDs, not objects
		const allForums = idsFromSearch
			.map((f) => {
				const id = typeof f === "object" ? f.id : f; // handle both {id: x} and number
				return allForumsMap.get(id);
			})
			.filter(Boolean); // remove any undefined

		// 5️⃣ Fetch dynamic fields fresh
		const dynamicData = await db
			.select({
				id: forums.id,
				viewCount: forums.viewCount,
				likeCount: sql`COUNT(DISTINCT ${forumLikes.id})`,
				isLiked: sql`CASE WHEN ${forumLikes.forumId} IS NOT NULL THEN true ELSE false END`,
			})
			.from(forums)
			.leftJoin(forumLikes, and(eq(forumLikes.forumId, forums.id), eq(forumLikes.userId, Number(userId))))
			.where(
				inArray(
					forums.id,
					idsFromSearch.map((f) => (typeof f === "object" ? f.id : f))
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

		return { data: forumsWithMedia, hasMore: allForums.length === limit, isMatch: searchResults.hits.length > 0 };
	} catch (error) {
		console.error("Error searching forums:", error);
		throw error;
	}
};
