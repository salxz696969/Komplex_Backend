import { db } from "@/db/index.js";
import { videos } from "@/db/models/videos.js";
import { redis } from "@/db/redis/redisConfig.js";
import { users, userSavedVideos, videoLikes } from "@/db/schema.js";
import { meilisearch } from "@/meilisearch/meilisearchConfig.js";
import { and, eq, inArray, sql } from "drizzle-orm";

export const searchVideosService = async (query: string, limit: number, offset: number, userId: number) => {
	try {
		const searchResults = await meilisearch.index("videos").search(query, {
			limit,
			offset,
		});
		const videoIdRows = searchResults.hits.map((hit: any) => hit.id);
		const cachedResults = (await redis.mGet(videoIdRows.map((v) => `videos:${v.id}`))) as (string | null)[];
		const hits: any[] = [];
		const missedIds: number[] = [];

		if (cachedResults.length > 0) {
			cachedResults.forEach((item, idx) => {
				if (item) hits.push(JSON.parse(item));
				else missedIds.push(videoIdRows[idx].id);
			});
		}

		// 3️⃣ Fetch missing videos from DB
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
					viewCount: videos.viewCount,
				})
				.from(videos)
				.leftJoin(users, eq(videos.userId, users.id))
				.where(inArray(videos.id, missedIds));

			for (const video of videoRows) {
				const formatted = {
					id: video.id,
					userId: video.userId,
					title: video.title,
					description: video.description,
					type: video.type,
					topic: video.topic,
					duration: video.duration,
					videoUrl: video.videoUrl,
					thumbnailUrl: video.thumbnailUrl,
					createdAt: video.createdAt,
					updatedAt: video.updatedAt,
					username: video.username,
					viewCount: video.viewCount,
				};
				missedVideos.push(formatted);
				await redis.set(`videos:${video.id}`, JSON.stringify(formatted), {
					EX: 600,
				});
			}
		}

		// 4️⃣ Merge hits and missed videos, preserving original order
		const allVideosMap = new Map<number, any>();
		for (const video of [...hits, ...missedVideos]) allVideosMap.set(video.id, video);
		const allVideos = videoIdRows.map((v) => allVideosMap.get(v.id));

		// 5️⃣ Fetch dynamic fields fresh
		const dynamicData = await db
			.select({
				id: videos.id,
				viewCount: videos.viewCount,
				likeCount: sql`COUNT(DISTINCT ${videoLikes.id})`,
				saveCount: sql`COUNT(DISTINCT ${userSavedVideos.id})`,
				isLike: sql`CASE WHEN ${videoLikes.videoId} IS NOT NULL THEN true ELSE false END`,
				isSave: sql`CASE WHEN ${userSavedVideos.videoId} IS NOT NULL THEN true ELSE false END`,
			})
			.from(videos)
			.leftJoin(videoLikes, and(eq(videoLikes.videoId, videos.id), eq(videoLikes.userId, Number(userId))))
			.leftJoin(
				userSavedVideos,
				and(eq(userSavedVideos.videoId, videos.id), eq(userSavedVideos.userId, Number(userId)))
			)
			.where(
				inArray(
					videos.id,
					videoIdRows.map((v) => v.id)
				)
			)
			.groupBy(videos.id, videoLikes.videoId, userSavedVideos.videoId);

		const videosWithMedia = allVideos.map((v) => {
			const dynamic = dynamicData.find((d) => d.id === v.id);
			return {
				...v,
				viewCount: Number(dynamic?.viewCount ?? 0) + 1,
				likeCount: Number(dynamic?.likeCount) || 0,
				saveCount: Number(dynamic?.saveCount) || 0,
				isLike: !!dynamic?.isLike,
				isSave: !!dynamic?.isSave,
			};
		});

		return { data: videosWithMedia, hasMore: allVideos.length === limit };
	} catch (error) {
		console.error("Error searching blogs:", error);
		throw error;
	}
};
