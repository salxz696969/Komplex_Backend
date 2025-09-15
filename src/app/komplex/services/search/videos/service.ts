import { db } from "@/db/index.js";
import { videos } from "@/db/models/videos.js";
import { redis } from "@/db/redis/redisConfig.js";
import { users, userSavedVideos, videoLikes } from "@/db/schema.js";
import { meilisearch } from "@/config/meilisearchConfig.js";
import { and, ConsoleLogWriter, eq, inArray, sql } from "drizzle-orm";

export const searchVideosService = async (query: string, limit: number, offset: number, userId: number) => {
	try {
		const searchAmount = await meilisearch.index("videos").search("", { limit: 1 });
		if (searchAmount.estimatedTotalHits === 0) {
			const cacheKey = "videoSearch";
			const dataFromRedis = await redis.lRange(cacheKey, 0, -1);
			if (dataFromRedis.length > 0) {
				await meilisearch.index("videos").addDocuments(dataFromRedis.map((item) => JSON.parse(item)));
			}
		}
		const searchResults = await meilisearch.index("videos").search(query, {
			limit,
			offset,
		});

		// 2️⃣ Extract IDs
		const videoIdRows: number[] = searchResults.hits.map((hit: any) => hit.id);

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

		return { data: videosWithMedia, hasMore: allVideos.length === limit };
	} catch (error) {
		console.error("Error searching videos:", error);
		throw error;
	}
};
