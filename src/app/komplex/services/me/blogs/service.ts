import { eq, sql, desc, and } from "drizzle-orm";
import { db } from "@/db/index.js";
import { redis } from "@/db/redis/redisConfig.js";
import { blogs, blogMedia, users } from "@/db/schema.js";
import { uploadImageToCloudflare } from "@/db/cloudflare/cloudflareFunction.js";
import { meilisearch } from "@/config/meilisearchConfig.js";
import { profile } from "console";

export const getAllMyBlogs = async (page: string, userId: number, type?: string, topic?: string) => {
	const conditions = [];
	conditions.push(eq(blogs.userId, userId));
	if (type) conditions.push(eq(blogs.type, type as string));
	if (topic) conditions.push(eq(blogs.topic, topic as string));
	const pageNumber = Number(page) || 1;
	const limit = 20;
	const offset = (pageNumber - 1) * limit;
	const cacheKey = `userBlogs:${userId}:type:${type || "all"}:topic:${topic || "all"}:page:${pageNumber}`;
	const cached = await redis.get(cacheKey);
	const parsedCached = cached ? JSON.parse(cached) : null;
	if (parsedCached) {
		let dataToSend = [] as any[];
    await Promise.all(
      parsedCached.data.map(async (blog: any) => {
        const [freshBlogData] = await db
          .select({
            likeCount: sql`COUNT(DISTINCT ${blogs.likeCount})`,
            viewCount: blogs.viewCount,
          })
          .from(blogs)
          .where(eq(blogs.id, blog.id))
          .groupBy(blogs.id);
        dataToSend.push({
          ...blog,
          likeCount: Number(freshBlogData.likeCount),
          viewCount: freshBlogData.viewCount,
        });
      })
    );
		return { data: [...dataToSend], hasMore: parsedCached.length === limit };
	}
	const blogsFromDb = await db
		.select({
			id: blogs.id,
			userId: blogs.userId,
			title: blogs.title,
			description: blogs.description,
			type: blogs.type,
			topic: blogs.topic,
			viewCount: blogs.viewCount,
			createdAt: blogs.createdAt,
			userFirstName: users.firstName,
			userLastName: users.lastName,
			profileImage: users.profileImage,
		})
		.from(blogs)
		.leftJoin(users, eq(blogs.userId, users.id))
		.where(conditions.length > 0 ? and(...conditions) : undefined)
		.limit(limit)
		.offset(offset)
		.orderBy(sql`CASE WHEN DATE(${blogs.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END DESC`, desc(blogs.updatedAt));

	const blogsWithMedia = await Promise.all(
		blogsFromDb.map(async (blog) => {
			const media = await db.select().from(blogMedia).where(eq(blogMedia.blogId, blog.id));
			return {
				id: blog.id,
				userId: blog.userId,
				title: blog.title,
				description: blog.description,
				type: blog.type,
				topic: blog.topic,
				viewCount: blog.viewCount,
				createdAt: blog.createdAt,
				username: `${blog.userFirstName} ${blog.userLastName}`,
				profileImage: blog.profileImage,
				media: media.map((m) => ({ url: m.url, mediaType: m.mediaType })),
			};
		})
	);
	await redis.set(
		cacheKey,
		JSON.stringify({
			data: blogsWithMedia,
			hasMore: blogsWithMedia.length === limit,
		}),
		{
			EX: 600,
		}
	);

	return { data: blogsWithMedia, hasMore: blogsWithMedia.length === limit };
};

export const postBlog = async (body: any, files: any, userId: number) => {
	const { title, description, type, topic } = body;

	if (!userId || !title || !description) {
		throw new Error("Missing required fields");
	}

	// Insert blog
	const [newBlog] = await db
		.insert(blogs)
		.values({
			userId: Number(userId),
			title,
			description,
			type,
			topic,
			viewCount: 0,
			likeCount: 0,
			createdAt: new Date(),
			updatedAt: new Date(),
		})
		.returning();

	// Insert blog media if uploaded
	let newBlogMedia: any[] = [];
	if (files) {
		for (const file of files as Express.Multer.File[]) {
			try {
				const uniqueKey = `${newBlog.id}-${crypto.randomUUID()}-${file.originalname}`;
				const url = await uploadImageToCloudflare(uniqueKey, file.buffer, file.mimetype);
				const [newMedia] = await db
					.insert(blogMedia)
					.values({
						blogId: newBlog.id,
						url: url,
						urlForDeletion: uniqueKey,
						mediaType: "image",
						createdAt: new Date(),
						updatedAt: new Date(),
					})
					.returning();
				newBlogMedia.push(newMedia);
			} catch (error) {
				console.error("Error uploading file or saving media:", error);
			}
		}
	}

	const [username] = await db
		.select({ firstName: users.firstName, lastName: users.lastName })
		.from(users)
		.where(eq(users.id, Number(userId)));
	const blogWithMedia = {
		id: newBlog.id,
		userId: newBlog.userId,
		title: newBlog.title,
		description: newBlog.description,
		type: newBlog.type,
		topic: newBlog.topic,
		createdAt: newBlog.createdAt,
		updatedAt: newBlog.updatedAt,
		username: username.firstName + " " + username.lastName,
		media: newBlogMedia.map((m) => ({
			url: m.url,
			type: m.mediaType,
		})),
	};
	const redisKey = `blogs:${newBlog.id}`;
	const meilisearchData = {
		id: blogWithMedia.id,
		title: blogWithMedia.title,
		description: blogWithMedia.description,
		type: blogWithMedia.type,
		topic: blogWithMedia.topic,
	};
	await meilisearch.index("blogs").addDocuments([meilisearchData]);

	await redis.set(redisKey, JSON.stringify(blogWithMedia), { EX: 600 });
	await redis.del(`dashboardData:${userId}`);
	const myBlogKeys: string[] = await redis.keys(`userBlogs:${userId}:type:*:topic:*:page:*`);
	if (myBlogKeys.length > 0) {
		await redis.del(myBlogKeys);
	}

	return { success: true, data: newBlog, newBlogMedia };
};
