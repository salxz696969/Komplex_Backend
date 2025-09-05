import { db } from "@/db/index.js";
import { forumComments, forumCommentMedias, forumCommentLikes, forumReplies, users } from "@/db/schema.js";
import { AuthenticatedRequest } from "@/types/request.js";
import { Response } from "express";
import { uploadImageToCloudflare } from "@/db/cloudflare/cloudflareFunction.js";
import { redis } from "@/db/redis/redisConfig.js";
import { and, eq, inArray } from "drizzle-orm";
import { deleteFromCloudflare } from "@/db/cloudflare/cloudflareFunction.js";

export const postForumComment = async (
    req: AuthenticatedRequest,
    res: Response
  ) => {
    try {
      const { userId } = req.user ?? { userId: 1 };
      const { description } = req.body;
      const { id } = req.params;
      const limit = 40;
  
      if (!userId || !id || !description) {
        return res
          .status(400)
          .json({ success: false, message: "Missing required fields" });
      }
  
      const [newForumComment] = await db
        .insert(forumComments)
        .values({
          userId: Number(userId),
          forumId: Number(id),
          description,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
  
      let newCommentMedia: any[] = [];
      if (req.files) {
        for (const file of req.files as Express.Multer.File[]) {
          try {
            const uniqueKey = `${newForumComment.id}-${crypto.randomUUID()}-${
              file.originalname
            }`;
            const url = await uploadImageToCloudflare(
              uniqueKey,
              file.buffer,
              file.mimetype
            );
            const [media] = await db
              .insert(forumCommentMedias)
              .values({
                forumCommentId: newForumComment.id,
                url: url,
                urlForDeletion: uniqueKey,
                mediaType: file.mimetype.startsWith("video") ? "video" : "image",
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              .returning();
            newCommentMedia.push(media);
          } catch (error) {
            console.error("Error uploading file or saving media:", error);
          }
        }
      }
      const [username] = await db
        .select({ firstName: users.firstName, lastName: users.lastName })
        .from(users)
        .where(eq(users.id, Number(userId)));
      const forumCommentWithMedia = {
        id: newForumComment.id,
        userId: newForumComment.userId,
        description: newForumComment.description,
        createdAt: newForumComment.createdAt,
        updatedAt: newForumComment.updatedAt,
        username: username.firstName + " " + username.lastName,
        isSave: false,
        media: newCommentMedia.map((m) => ({
          url: m.url,
          type: m.mediaType,
        })),
      };
  
      let { currentCommentAmount, lastPage } = JSON.parse(
        (await redis.get(`forumComments:forum:${id}:lastPage`)) ||
          JSON.stringify({ currentCommentAmount: 0, lastPage: 1 })
      );
  
      // Determine which page to add the new comment
      if (currentCommentAmount >= limit) {
        // Last page is full → create a new page
        lastPage += 1;
        currentCommentAmount = 1;
      } else {
        // Add to existing last page
        currentCommentAmount += 1;
      }
  
      const cacheKey = `forumComments:forum:${id}:page:${lastPage}`;
      const cached = await redis.get(cacheKey);
  
      if (cached) {
        const parsed = JSON.parse(cached);
        parsed.commentsWithMedia.push(forumCommentWithMedia);
        await redis.set(cacheKey, JSON.stringify(parsed), { EX: 600 });
      } else {
        await redis.set(
          cacheKey,
          JSON.stringify({ commentsWithMedia: [forumCommentWithMedia] }),
          { EX: 600 }
        );
      }
  
      // Update last page info in Redis
      await redis.set(
        `forumComments:forum:${id}:lastPage`,
        JSON.stringify({ currentCommentAmount, lastPage }),
        {
          EX: 600,
        }
      );
  
      return res.status(201).json({
        success: true,
        comment: newForumComment,
        newCommentMedia,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  };