import { db } from "@/db/index.js";
import {
  videoReplies,
  videoReplyMedias,
  videoReplyLike,
  users,
} from "@/db/schema.js";
import { uploadVideoToCloudflare } from "@/db/cloudflare/cloudflareFunction.js";
import { redis } from "@/db/redis/redisConfig.js";
import { and, eq, inArray } from "drizzle-orm";
import { deleteFromCloudflare } from "@/db/cloudflare/cloudflareFunction.js";

export const postVideoReply = async (
  id: string,
  userId: number,
  description: string,
  files: any
) => {
  if (!userId || !id || !description) {
    throw new Error("Missing required fields");
  }

  const [insertReply] = await db
    .insert(videoReplies)
    .values({
      userId: Number(userId),
      videoCommentId: Number(id),
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  let newVideoReplyMedia: any[] = [];
  if (files) {
    for (const file of files as Express.Multer.File[]) {
      try {
        const uniqueKey = `${insertReply.id}-${crypto.randomUUID()}-${
          file.originalname
        }`;
        const url = await uploadVideoToCloudflare(
          uniqueKey,
          file.buffer,
          file.mimetype
        );
        const [media] = await db
          .insert(videoReplyMedias)
          .values({
            videoReplyId: insertReply.id,
            url: url,
            urlForDeletion: uniqueKey,
            mediaType: file.mimetype.startsWith("video") ? "video" : "image",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        newVideoReplyMedia.push(media);
      } catch (error) {
        console.error("Error uploading file or saving media:", error);
      }
    }
  }

  const [username] = await db
    .select({ 
      firstName: users.firstName, 
      lastName: users.lastName,
      profileImage: users.profileImage // Add this line
    })
    .from(users)
    .where(eq(users.id, Number(userId)));
  const replyWithMedia = {
    id: insertReply.id,
    userId: insertReply.userId,
    videoCommentId: insertReply.videoCommentId,
    description: insertReply.description,
    createdAt: insertReply.createdAt,
    updatedAt: insertReply.updatedAt,
    username: username.firstName + " " + username.lastName,
    profileImage: username.profileImage, // Add this line
    media: newVideoReplyMedia.map((m) => ({
      url: m.url,
      type: m.mediaType,
    })),
  };

  const limit = 20;
  let { currentReplyAmount, lastPage } = JSON.parse(
    (await redis.get(`videoReplies:comment:${id}:lastPage`)) ||
      JSON.stringify({ currentReplyAmount: 0, lastPage: 1 })
  );

  if (currentReplyAmount >= limit) {
    lastPage += 1;
    currentReplyAmount = 1;
  } else {
    currentReplyAmount += 1;
  }

  const cacheKey = `videoReplies:comment:${id}:page:${lastPage}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    const parsed = JSON.parse(cached);
    parsed.repliesWithMedia.push(replyWithMedia);
    await redis.set(cacheKey, JSON.stringify(parsed), { EX: 600 });
  } else {
    await redis.set(
      cacheKey,
      JSON.stringify({ repliesWithMedia: [replyWithMedia] }),
      { EX: 600 }
    );
  }

  await redis.set(
    `videoReplies:comment:${id}:lastPage`,
    JSON.stringify({ currentReplyAmount, lastPage }),
    {
      EX: 600,
    }
  );

  return {
    data: {
      success: true,
      reply: insertReply,
      newVideoReplyMedia,
    },
  };
};
