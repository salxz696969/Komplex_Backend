import { db } from "@/db/index.js";
import { redis } from "@/db/redis/redisConfig.js";
import { blogs, blogMedia, users, followers } from "@/db/schema.js";
import { and, desc, eq, sql } from "drizzle-orm";

export const getUserBlogs = async (userId: number, page?: string, topic?: string, type?: string) => {
	try {
		const pageNumber = Number(page) || 1;
		const limit = 20;
		const offset = (pageNumber - 1) * limit;
		const cacheKey = `userBlogs:${userId}:type:${type || "all"}:topic:${topic || "all"}:page:${pageNumber}`;
		// Try to get from cache first
		const cachedBlogs = await redis.get(cacheKey);
		const parsedCached = cachedBlogs ? JSON.parse(cachedBlogs) : null;
		if (parsedCached) {
			const isFollowing = await db
				.select()
				.from(followers)
				.where(and(eq(followers.followedId, Number(parsedCached.userId)), eq(followers.userId, userId)));
			return { parsedCached, isFollowing: isFollowing.length > 0, hasMore: parsedCached.length === limit };
		}

		const userBlogs = await db
			.select({
				id: blogs.id,
				userId: blogs.userId,
				title: blogs.title,
				description: blogs.description,
				type: blogs.type,
				topic: blogs.topic,
				viewCount: blogs.viewCount,
				createdAt: blogs.createdAt,
				updatedAt: blogs.updatedAt,
				mediaUrl: blogMedia.url,
				mediaType: blogMedia.mediaType,
				username: sql`${users.firstName} || ' ' || ${users.lastName}`,
			})
			.from(blogs)
			.leftJoin(blogMedia, eq(blogs.id, blogMedia.blogId))
			.leftJoin(users, eq(blogs.userId, users.id))
			.where(eq(blogs.userId, userId))
			.orderBy(desc(blogs.createdAt))
			.limit(limit)
			.offset(offset);

		// Group blogs by ID and collect media
		const blogMap = new Map<number, any>();
		for (const blog of userBlogs) {
			if (!blogMap.has(blog.id)) {
				const formatted = {
					id: blog.id,
					userId: blog.userId,
					title: blog.title,
					description: blog.description,
					type: blog.type,
					topic: blog.topic,
					viewCount: blog.viewCount,
					createdAt: blog.createdAt,
					updatedAt: blog.updatedAt,
					username: blog.username,
					media: [] as { url: string; type: string }[],
				};
				blogMap.set(blog.id, formatted);
			}

			if (blog.mediaUrl) {
				blogMap.get(blog.id).media.push({
					url: blog.mediaUrl,
					type: blog.mediaType,
				});
			}
		}

		const blogsWithMedia = Array.from(blogMap.values());

		// Cache for 5 minutes
		await redis.set(cacheKey, JSON.stringify({ data: blogsWithMedia }), {
			EX: 300,
		});

		return { data: blogsWithMedia, hasMore: blogsWithMedia.length === limit };
	} catch (error) {
		throw new Error("Failed to get user blogs");
	}
};
