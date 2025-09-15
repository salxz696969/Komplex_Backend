import { db } from "@/db/index.js";
import { videos } from "@/db/models/videos.js";
import { redis } from "@/db/redis/redisConfig.js";
import { followers, users, userSavedVideos, videoLikes } from "@/db/schema.js";
import { meilisearch } from "@/config/meilisearchConfig.js";
import { and, ConsoleLogWriter, desc, eq, inArray, sql } from "drizzle-orm";

export const searchVideosService = async (query: string, limit: number, offset: number, userId: number) => {
	try {
		const searchResults = await meilisearch.index("videos").search(query, {
			limit,
			offset,
		});

		// 2️⃣ Extract IDs
		let videoIdRows = searchResults.hits.map((hit: any) => hit.id);
		if (searchResults.hits.length === 0) {
			const followedUsersVideosId = await db
				.select({ id: videos.id, userId: videos.userId })
				.from(videos)
				.where(
					inArray(
						videos.userId,
						db
							.select({ followedId: followers.followedId })
							.from(followers)
							.where(eq(followers.userId, Number(userId)))
					)
				)
				.orderBy(
					desc(sql`CASE WHEN DATE(${videos.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END`),
					desc(videos.viewCount),
					desc(videos.updatedAt),
					desc(sql`(SELECT COUNT(*) FROM ${videoLikes} WHERE ${videoLikes.videoId} = ${videos.id})`)
				)
				.limit(5);

			// 1️⃣ Fetch filtered video IDs from DB
			const videoIds = await db
				.select({ id: videos.id, userId: videos.userId })
				.from(videos)
				.orderBy(
					desc(sql`CASE WHEN DATE(${videos.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END`),
					desc(videos.viewCount),
					desc(videos.updatedAt),
					desc(sql`(SELECT COUNT(*) FROM ${videoLikes} WHERE ${videoLikes.videoId} = ${videos.id})`)
				)
				.offset(offset)
				.limit(limit);

			videoIdRows = Array.from(
				new Set([...followedUsersVideosId.map((f) => f.id), ...videoIds.map((f) => f.id)])
			);
		}

		// 3️⃣ Check cache
		const cachedResults = (await redis.mGet(videoIdRows.map((id) => `videos:${id}`))) as (string | null)[];

		const hits: any[] = [];
		const missedIds: number[] = [];

		cachedResults.forEach((item, idx) => {
			if (item) hits.push(JSON.parse(item));
			else missedIds.push(videoIdRows[idx]);
		});

		// 4️⃣ Fetch missing videos from DB
		let missedVideos: any[] = [];
		if (missedIds.length > 0) {
			const videoRows = await db
				.select({
					id: videos.id,
					userId: videos.userId,
					title: videos.title,
					description: videos.description,
					type: videos.type,
					topic: videos.topic,
					duration: videos.duration,
					videoUrl: videos.videoUrl,
					thumbnailUrl: videos.thumbnailUrl,
					createdAt: videos.createdAt,
					updatedAt: videos.updatedAt,
					username: sql`${users.firstName} || ' ' || ${users.lastName}`,
					profileImage: users.profileImage,
					viewCount: videos.viewCount,
				})
				.from(videos)
				.leftJoin(users, eq(videos.userId, users.id))
				.where(inArray(videos.id, missedIds));

			for (const video of videoRows) {
				const formatted = { ...video };
				missedVideos.push(formatted);
				await redis.set(`videos:${video.id}`, JSON.stringify(formatted), { EX: 600 });
			}
		}

		// 5️⃣ Merge hits + missed videos, preserving original order
		const allVideosMap = new Map<number, any>();
		for (const video of [...hits, ...missedVideos]) allVideosMap.set(video.id, video);
		const allVideos = videoIdRows.map((id) => allVideosMap.get(id)).filter(Boolean);

		// 6️⃣ Fetch dynamic fields
		const dynamicData = await db
			.select({
				id: videos.id,
				viewCount: videos.viewCount,
				likeCount: sql`COUNT(DISTINCT ${videoLikes.id})`,
				saveCount: sql`COUNT(DISTINCT ${userSavedVideos.id})`,
				isLiked: sql`CASE WHEN ${videoLikes.videoId} IS NOT NULL THEN true ELSE false END`,
				isSaved: sql`CASE WHEN ${userSavedVideos.videoId} IS NOT NULL THEN true ELSE false END`,
			})
			.from(videos)
			.leftJoin(videoLikes, and(eq(videoLikes.videoId, videos.id), eq(videoLikes.userId, Number(userId))))
			.leftJoin(
				userSavedVideos,
				and(eq(userSavedVideos.videoId, videos.id), eq(userSavedVideos.userId, Number(userId)))
			)
			.where(inArray(videos.id, videoIdRows))
			.groupBy(videos.id, videoLikes.videoId, userSavedVideos.videoId);

		// 7️⃣ Combine with dynamic fields
		const videosWithMedia = allVideos.map((v) => {
			const dynamic = dynamicData.find((d) => d.id === v.id);
			return {
				...v,
				viewCount: Number(dynamic?.viewCount ?? 0) + 1,
				likeCount: Number(dynamic?.likeCount) || 0,
				saveCount: Number(dynamic?.saveCount) || 0,
				isLiked: !!dynamic?.isLiked,
				isSaved: !!dynamic?.isSaved,
			};
		});

		return { data: videosWithMedia, hasMore: allVideos.length === limit, isMatch: searchResults.hits.length > 0 };
	} catch (error) {
		console.error("Error searching videos:", error);
		throw error;
	}
};
