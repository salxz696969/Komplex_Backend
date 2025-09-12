import { and, eq, desc, sql, inArray, ne } from "drizzle-orm";
import { db } from "@/db/index.js";
import { redis } from "@/db/redis/redisConfig.js";
import { blogs, blogMedia, followers, users, userSavedBlogs } from "@/db/schema.js";
import { profile } from "console";

export const getAllBlogs = async (type?: string, topic?: string, page?: string, userId?: number) => {
	try {
		const conditions = [];
		if (type) conditions.push(eq(blogs.type, type));
		if (topic) conditions.push(eq(blogs.topic, topic));

		const pageNumber = Number(page) || 1;
		const limit = 20;
		const offset = (pageNumber - 1) * limit;

		const followedUsersBlogsId = await db
			.select({ id: blogs.id })
			.from(blogs)
			.where(
				inArray(
					blogs.userId,
					db
						.select({ followedId: followers.followedId })
						.from(followers)
						.where(eq(followers.userId, Number(userId)))
				)
			)
			.orderBy(
				desc(sql`CASE WHEN DATE(${blogs.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END`),
				desc(blogs.likeCount),
				desc(blogs.updatedAt)
			)
			.limit(5);

		// 1️⃣ Fetch filtered blog IDs from DB
		const blogIds = await db
			.select({ id: blogs.id })
			.from(blogs)
			.where(and(conditions.length > 0 ? and(...conditions) : undefined, ne(blogs.userId, Number(userId))))
			.orderBy(
				desc(sql`CASE WHEN DATE(${blogs.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END`),
				desc(blogs.likeCount),
				desc(blogs.updatedAt)
			)
			.offset(offset)
			.limit(limit);

		const blogIdRows = Array.from(
			Array.from(new Set([...followedUsersBlogsId.map((f) => f.id), ...blogIds.map((f) => f.id)])).map((id) => ({
				id,
			}))
		);

		if (!blogIdRows.length) {
			return { data: [], hasMore: false };
		}

		// 2️⃣ Fetch blogs from Redis in one call
		const cachedResults = (await redis.mGet(blogIdRows.map((b) => `blogs:${b.id}`))) as (string | null)[];

		const hits: any[] = [];
		const missedIds: number[] = [];

		if (cachedResults.length > 0) {
			cachedResults.forEach((item, idx) => {
				if (item) hits.push(JSON.parse(item));
				else missedIds.push(blogIdRows[idx].id);
			});
		}

		// 3️⃣ Fetch missing blogs from DB
		let missedBlogs: any[] = [];
		if (missedIds.length > 0) {
			const blogRows = await db
				.select({
					id: blogs.id,
					userId: blogs.userId,
					title: blogs.title,
					description: blogs.description,
					type: blogs.type,
					topic: blogs.topic,
					createdAt: blogs.createdAt,
					updatedAt: blogs.updatedAt,
					mediaUrl: blogMedia.url,
					mediaType: blogMedia.mediaType,
					username: sql`${users.firstName} || ' ' || ${users.lastName}`,
					profileImage: users.profileImage,
				})
				.from(blogs)
				.leftJoin(blogMedia, eq(blogs.id, blogMedia.blogId))
				.leftJoin(users, eq(blogs.userId, users.id))
				.where(inArray(blogs.id, missedIds));

			const blogMap = new Map<number, any>();
			for (const blog of blogRows) {
				if (!blogMap.has(blog.id)) {
					const formatted = {
						id: blog.id,
						userId: blog.userId,
						title: blog.title,
						description: blog.description,
						type: blog.type,
						topic: blog.topic,
						createdAt: blog.createdAt,
						updatedAt: blog.updatedAt,
						username: blog.username,
						profileImage: blog.profileImage,
						media: [] as { url: string; type: string }[],
					};
					blogMap.set(blog.id, formatted);
					missedBlogs.push(formatted);
				}

				if (blog.mediaUrl) {
					blogMap.get(blog.id).media.push({
						url: blog.mediaUrl,
						type: blog.mediaType,
					});
				}
			}

			// Write missed blogs to Redis
			for (const blog of missedBlogs) {
				await redis.set(`blogs:${blog.id}`, JSON.stringify(blog), { EX: 600 });
			}
		}

		// 4️⃣ Merge hits and missed blogs, preserving original order
		const allBlogsMap = new Map<number, any>();
		for (const blog of [...hits, ...missedBlogs]) allBlogsMap.set(blog.id, blog);
		const allBlogs = blogIdRows.map((b) => allBlogsMap.get(b.id));

		// 5️⃣ Fetch dynamic fields fresh
		const dynamicData = await db
			.select({
				id: blogs.id,
				viewCount: blogs.viewCount,
				likeCount: blogs.likeCount,
				isSave: sql`CASE WHEN ${userSavedBlogs.blogId} IS NOT NULL THEN true ELSE false END`,
			})
			.from(blogs)
			.leftJoin(
				userSavedBlogs,
				and(eq(userSavedBlogs.blogId, blogs.id), eq(userSavedBlogs.userId, Number(userId)))
			)
			.where(
				inArray(
					blogs.id,
					blogIdRows.map((b) => b.id)
				)
			);

		const blogsWithMedia = allBlogs.map((b) => {
			const dynamic = dynamicData.find((d) => d.id === b.id);
			return {
				...b,
				viewCount: dynamic?.viewCount ?? 0,
				likeCount: dynamic?.likeCount ?? 0,
				isSave: !!dynamic?.isSave,
			};
		});

		return { data: blogsWithMedia, hasMore: allBlogs.length === limit };
	} catch (error) {
		throw new Error((error as Error).message);
	}
};
