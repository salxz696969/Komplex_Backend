import { Request, Response } from "express";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../../db/cloudinary/cloundinaryFunction.js";
import { db } from "../../../db/index.js";
import { blogs, users } from "../../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { blogMedia } from "../../../db/models/blog_media.js";
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    // add other user properties if needed
  };
}

export const postBlog = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let public_url: string | null = null;
    let mediaType: "image" | "video" | null = null;

    if (req.file) {
      const result = (await uploadToCloudinary(
        req.file.buffer,
        "my_app_uploads",
        "auto"
      )) as {
        public_url: string;
      };
      public_url = result.public_url;
      mediaType = req.file.mimetype.startsWith("video") ? "video" : "image";
    }

    const { userId } = req.user ?? {};
    const { title, description, type, topic } = req.body;

    if (!userId || !title || !description) {
      // Validate required fields
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    try {
      const newBlog = await db
        .insert(blogs)
        .values({
          userId: Number(userId),
          title,
          description,
          type,
          topic,
          viewCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      if (public_url) {
        await db.insert(blogMedia).values({
          blogId: newBlog[0].id,
          url: public_url,
          mediaType: mediaType,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return res.status(201).json(newBlog[0]);
    } catch (dbError) {
      // If DB insert fails and we uploaded a file, delete from Cloudinary
      if (public_url && mediaType) {
        await deleteFromCloudinary(public_url, mediaType);
      }
      return res
        .status(500)
        .json({ success: false, error: (dbError as Error).message });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: (error as Error).message });
  }
};

export const getAllBlogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, topic } = req.query;

    const conditions = [];
    if (type) conditions.push(eq(blogs.type, type as string));
    if (topic) conditions.push(eq(blogs.topic, topic as string));

    const blogsFromDb =
      conditions.length > 0
        ? await db
            .select({
              id: blogs.id,
              userId: blogs.userId,
              title: blogs.title,
              description: blogs.description,
              type: blogs.type,
              topic: blogs.topic,
              userFirstName: users.firstName,
              userLastName: users.lastName,
              viewCount: blogs.viewCount,
              createdAt: blogs.createdAt,
              updatedAt: blogs.updatedAt,
            })
            .from(blogs)
            .where(and(...conditions))
        : await db
            .select({
              id: blogs.id,
              userId: blogs.userId,
              title: blogs.title,
              description: blogs.description,
              type: blogs.type,
              topic: blogs.topic,
              userFirstName: users.firstName,
              userLastName: users.lastName,
              viewCount: blogs.viewCount,
              createdAt: blogs.createdAt,
              updatedAt: blogs.updatedAt,
            })
            .from(blogs)
            .leftJoin(users, eq(blogs.userId, users.id));

    const blogWithMedia = await Promise.all(
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
          updatedAt: blog.updatedAt,
          username: `${blog.userFirstName} ${blog.userLastName}`,
          media: media.map((m) => ({ url: m.url, mediaType: m.mediaType })),
        };
      })
    );

    return res.status(200).json(blogWithMedia);
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

    const blog = await db
      .select()
      .from(blogs)
      .where(eq(blogs.id, Number(id)))
      .limit(1);

    if (!blog || blog.length === 0 || !blog[0]) {
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });
    }

    if (blog && blog.length > 0 && blog[0]) {
      await db
        .update(blogs)
        .set({
          viewCount: (blog[0]?.viewCount ?? 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(blogs.id, Number(id)))
        .returning();
    }

    return res.json(blog).status(200);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const likeBlog = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.body;
    const { userId } = req.user ?? {};

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const blog = await db
      .select()
      .from(blogs)
      .where(eq(blogs.id, Number(id)))
      .limit(1);

    if (!blog || blog.length === 0 || !blog[0]) {
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });
    }

    return res.json(blog).status(200);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};
