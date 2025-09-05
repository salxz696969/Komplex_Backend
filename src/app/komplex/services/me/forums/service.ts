import { Response } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/index.js";
import { redis } from "@/db/redis/redisConfig.js";
import { forums, forumMedias, users } from "@/db/schema.js";
import { AuthenticatedRequest } from "@/types/request.js";
import { uploadImageToCloudflare } from "@/db/cloudflare/cloudflareFunction.js";

export const postForum = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.user ?? { userId: 1 };
    const { title, description, type, topic } = req.body;

    if (!userId || !title || !description) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // Insert forum
    const [newForum] = await db
      .insert(forums)
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

    // Insert forum media if uploaded
    let newForumMedia: any[] = [];
    if (req.files) {
      for (const file of req.files as Express.Multer.File[]) {
        try {
          const uniqueKey = `${newForum.id}-${crypto.randomUUID()}-${
            file.originalname
          }`;
          const url = await uploadImageToCloudflare(
            uniqueKey,
            file.buffer,
            file.mimetype
          );
          const [media] = await db
            .insert(forumMedias)
            .values({
              forumId: newForum.id,
              url: url,
              urlForDeletion: uniqueKey,
              mediaType: file.mimetype.startsWith("video") ? "video" : "image",
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();
          newForumMedia.push(media);
        } catch (error) {
          console.error("Error uploading file or saving media:", error);
        }
      }
    }

    const [username] = await db
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, Number(userId)));
    const forumWithMedia = {
      id: newForum.id,
      userId: newForum.userId,
      title: newForum.title,
      description: newForum.description,
      type: newForum.type,
      topic: newForum.topic,
      viewCount: newForum.viewCount,
      createdAt: newForum.createdAt,
      updatedAt: newForum.updatedAt,
      username: username.firstName + " " + username.lastName,
      isSave: false,
      media: newForumMedia.map((m) => ({
        url: m.url,
        type: m.mediaType,
      })),
    };
    const redisKey = `forums:${newForum.id}`;

    await redis.set(redisKey, JSON.stringify(forumWithMedia), { EX: 600 });

    return res.status(201).json({
      success: true,
      newForum,
      newForumMedia,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: (error as Error).message });
  }
};
