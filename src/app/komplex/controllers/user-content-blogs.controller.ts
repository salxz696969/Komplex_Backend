import { and, eq, sql } from "drizzle-orm";
import { blogs, users, userSavedBlogs } from "../../../db/schema.js";
import { db } from "../../../db/index.js";
import { Request, Response } from "express";
import { blogMedia } from "../../../db/models/blog_media.js";

export const getAllUserBlogs = async (req: Request, res: Response) => {
  try {
    //   const {userId} = req.params;

    let userId = 1; // just assuming, //TODO: change

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
      })
      .from(blogs)
      .leftJoin(users, eq(blogs.userId, users.id))
      .where(eq(blogs.userId, userId));

    const blogsWithMedia = await Promise.all(
      blogsFromDb.map(async (blog) => {
        const media = await db
          .select()
          .from(blogMedia)
          .where(eq(blogMedia.blogId, blog.id));
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
          media: media.map((m) => ({ url: m.url, mediaType: m.mediaType })),
        };
      })
    );

    return res.status(200).json(blogsWithMedia);
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
        and(
          eq(userSavedBlogs.blogId, blogs.id),
          eq(userSavedBlogs.userId, Number(userId))
        )
      )
      .where(eq(blogs.id, Number(id)));

    if (!blog || blog.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });
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
      isSave: !!blog[0].isSave,
      media: blog
        .filter((b) => b.mediaUrl)
        .map((b) => ({
          url: b.mediaUrl,
          type: b.mediaType,
        })),
    };

    return res.status(200).json(blogWithMedia);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};
