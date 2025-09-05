import { Response } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/index.js";
import { redis } from "@/db/redis/redisConfig.js";
import { blogs, blogMedia, users } from "@/db/schema.js";
import { AuthenticatedRequest } from "@/types/request.js";
import { uploadImageToCloudflare } from "@/db/cloudflare/cloudflareFunction.js";

export const postBlog = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.user ?? { userId: 1 };
    const { title, description, type, topic } = req.body;

    if (!userId || !title || !description) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
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
    if (req.files) {
      for (const file of req.files as Express.Multer.File[]) {
        try {
          const uniqueKey = `${newBlog.id}-${crypto.randomUUID()}-${
            file.originalname
          }`;
          const url = await uploadImageToCloudflare(
            uniqueKey,
            file.buffer,
            file.mimetype
          );
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

    await redis.set(redisKey, JSON.stringify(blogWithMedia), { EX: 600 });

    return res.status(201).json({
      success: true,
      newBlog,
      newBlogMedia,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: (error as Error).message });
  }
};
