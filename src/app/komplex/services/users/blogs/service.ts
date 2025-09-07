import { db } from "@/db/index.js";
import { redis } from "@/db/redis/redisConfig.js";
import { blogs, blogMedia, users } from "@/db/schema.js";
import { desc, eq, sql } from "drizzle-orm";

export const getUserBlogs = async (userId: number) => {
  try {
    const cacheKey = `user:${userId}:blogs`;

    // Try to get from cache first
    const cachedBlogs = await redis.get(cacheKey);
    if (cachedBlogs) {
      return { data: JSON.parse(cachedBlogs) };
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
      .orderBy(desc(blogs.createdAt));

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
    await redis.set(cacheKey, JSON.stringify(blogsWithMedia), { EX: 300 });

    return { data: blogsWithMedia };
  } catch (error) {
    throw new Error("Failed to get user blogs");
  }
};
