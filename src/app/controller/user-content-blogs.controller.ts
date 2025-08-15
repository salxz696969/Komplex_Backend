import { and, eq } from "drizzle-orm";
import { blogs, users } from "../../db/schema";
import { db } from "../../db";
import { Request, Response } from "express";
import { blogMedia } from "../../db/models/blog_media";

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
