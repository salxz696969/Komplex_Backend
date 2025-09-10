import { db } from "@/db/index.js";
import { blogs, blogMedia, users, userSavedBlogs } from "@/db/schema.js";
import { redis } from "@/db/redis/redisConfig.js";
import { eq, and, sql } from "drizzle-orm";
import { profile } from "console";

export const getBlogById = async (id: string, userId: number) => {
	const cacheKey = `blogs:${id}`;

	// Try Redis first (only static info)
	const cached = await redis.get(cacheKey);
	let blogData;
	if (cached) {
		blogData = JSON.parse(cached);
	} else {
		// Fetch blog static info
		const blog = await db
			.select({
				id: blogs.id,
				userId: blogs.userId,
				title: blogs.title,
				description: blogs.description,
				type: blogs.type,
				topic: blogs.topic,
				createdAt: blogs.createdAt,
				updatedAt: blogs.updatedAt,
				viewCount: blogs.viewCount,
				mediaUrl: blogMedia.url,
				mediaType: blogMedia.mediaType,
				username: sql`${users.firstName} || ' ' || ${users.lastName}`,
				profileImage: users.profileImage,
			})
			.from(blogs)
			.leftJoin(blogMedia, eq(blogs.id, blogMedia.blogId))
			.leftJoin(users, eq(blogs.userId, users.id))
			.where(eq(blogs.id, Number(id)));

		if (!blog || blog.length === 0) {
			throw new Error("Blog not found");
		}

		// Increment view count
		await db
			.update(blogs)
			.set({
				viewCount: (blog[0]?.viewCount ?? 0) + 1,
				updatedAt: new Date(),
			})
			.where(eq(blogs.id, Number(id)));

		// Build static cacheable object
		blogData = {
			id: blog[0].id,
			userId: blog[0].userId,
			title: blog[0].title,
			description: blog[0].description,
			type: blog[0].type,
			topic: blog[0].topic,
			createdAt: blog[0].createdAt,
			updatedAt: new Date(),
			username: blog[0].username,
      profileImage: blog[0].profileImage,
			media: blog
				.filter((b) => b.mediaUrl)
				.map((b) => ({
					url: b.mediaUrl,
					type: b.mediaType,
				})),
		};

		// Cache static data only
		await redis.set(cacheKey, JSON.stringify(blogData), {
			EX: 600, // 10 minutes
		});
	}

	// Always fetch dynamic fields fresh
	const dynamic = await db
		.select({
			viewCount: blogs.viewCount,
			likeCount: blogs.likeCount,
			isSave: sql`CASE WHEN ${userSavedBlogs.blogId} IS NOT NULL THEN true ELSE false END`,
		})
		.from(blogs)
		.leftJoin(userSavedBlogs, and(eq(userSavedBlogs.blogId, blogs.id), eq(userSavedBlogs.userId, Number(userId))))
		.where(eq(blogs.id, Number(id)));

	const blogWithMedia = {
		...blogData,
		viewCount: (dynamic[0]?.viewCount ?? 0) + 1,
		likeCount: dynamic[0]?.likeCount ?? 0,
		isSaved: !!dynamic[0]?.isSave,
	};

	return { data: blogWithMedia };
};
