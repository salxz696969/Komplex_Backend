import { Request, Response } from "express";
import { deleteFromCloudinary, uploadToCloudinary } from "../../../db/cloudinary/cloundinaryFunction";
import { db } from "../../../db";
import { blogs, mediaTypeEnum, users, userSavedBlogs } from "../../../db/schema";
import { and, eq } from "drizzle-orm";
import { blogMedia } from "../../../db/models/blog_media";
import { create } from "domain";
import { sql } from "drizzle-orm";
import { AuthenticatedRequest } from "../../../types/request";

export const getAllBlogs = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { type, topic } = req.query;
		const { userId } = req.user ?? { userId: 1 };
		const conditions = [];
		if (type) conditions.push(eq(blogs.type, type as string));
		if (topic) conditions.push(eq(blogs.topic, topic as string));

		const blog = await db
			.select({
				id: blogs.id,
				userId: blogs.userId,
				title: blogs.title,
				description: blogs.description,
				type: blogs.type,
				topic: blogs.topic,
				viewCount: blogs.viewCount,
				likeCount: blogs.likeCount,
				createdAt: blogs.createdAt,
				updatedAt: blogs.updatedAt,
				mediaUrl: blogMedia.url,
				mediaType: blogMedia.mediaType,
				username: sql`${users.firstName} || ' ' || ${users.lastName}`,
				isSave: sql`CASE WHEN ${userSavedBlogs.blogId} IS NOT NULL THEN true ELSE false END`,
			})
			.from(blogs)
			.leftJoin(blogMedia, eq(blogs.id, blogMedia.blogId))
			.leftJoin(users, eq(blogs.userId, users.id))
			.leftJoin(
				userSavedBlogs,
				and(eq(userSavedBlogs.blogId, blogs.id), eq(userSavedBlogs.userId, Number(userId)))
			)
			.where(conditions.length > 0 ? and(...conditions) : undefined);

		const blogsWithMedia = Object.values(
			blog.reduce((acc, blog) => {
				if (!acc[blog.id]) {
					acc[blog.id] = {
						id: blog.id,
						userId: blog.userId,
						title: blog.title,
						description: blog.description,
						type: blog.type,
						topic: blog.topic,
						viewCount: blog.viewCount,
						likeCount: blog.likeCount,
						createdAt: blog.createdAt,
						updatedAt: blog.updatedAt,
						username: blog.username,
						isSave: !!blog.isSave,
						media: [] as { url: string; type: string }[],
					};
				}

				if (blog.mediaUrl) {
					acc[blog.id].media.push({
						url: blog.mediaUrl,
						type: blog.mediaType,
					});
				}
				return acc;
			}, {} as { [key: number]: any })
		) as Record<number, any>[];

		return res.status(200).json({ blogsWithMedia });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const getBlogById = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const userId = (req as any).user?.userId ?? "1";

		const blog = await db
			.select({
				id: blogs.id,
				userId: blogs.userId,
				title: blogs.title,
				description: blogs.description,
				type: blogs.type,
				topic: blogs.topic,
				viewCount: blogs.viewCount,
				likeCount: blogs.likeCount,
				createdAt: blogs.createdAt,
				updatedAt: blogs.updatedAt,
				mediaUrl: blogMedia.url,
				mediaType: blogMedia.mediaType,
				username: sql`${users.firstName} || ' ' || ${users.lastName}`,
				isSave: sql`CASE WHEN ${userSavedBlogs.blogId} IS NOT NULL THEN true ELSE false END`,
			})
			.from(blogs)
			.leftJoin(blogMedia, eq(blogs.id, blogMedia.blogId))
			.leftJoin(users, eq(blogs.userId, users.id))
			.leftJoin(
				userSavedBlogs,
				and(eq(userSavedBlogs.blogId, blogs.id), eq(userSavedBlogs.userId, Number(userId)))
			)
			.where(eq(blogs.id, Number(id)));

		if (!blog || blog.length === 0) {
			return res.status(404).json({ success: false, message: "Blog not found" });
		}

		// Increment view count
		await db
			.update(blogs)
			.set({ viewCount: (blog[0]?.viewCount ?? 0) + 1, updatedAt: new Date() })
			.where(eq(blogs.id, Number(id)));

    const blogWithMedia = {
      id: blog[0].id,
      userId: blog[0].userId,
      title: blog[0].title,
      description: blog[0].description,
      type: blog[0].type,
      topic: blog[0].topic,
      viewCount: (blog[0]?.viewCount ?? 0) + 1,
      likeCount: blog[0].likeCount,
      createdAt: blog[0].createdAt,
      updatedAt: new Date(),
      username: blog[0].username,
      isSaved: !!blog[0].isSave,
      media: blog
        .filter((b) => b.mediaUrl)
        .map((b) => ({
          url: b.mediaUrl,
          type: b.mediaType,
        })),
    };

		return res.status(200).json({ blog: blogWithMedia });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};
