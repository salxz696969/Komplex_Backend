import { db } from "@/db/index.js";
import { forumReplies, forumReplyMedias, users } from "@/db/schema.js";
import { uploadImageToCloudflare } from "@/db/cloudflare/cloudflareFunction.js";
import { redis } from "@/db/redis/redisConfig.js";
import { eq, inArray } from "drizzle-orm";
import { deleteFromCloudflare } from "@/db/cloudflare/cloudflareFunction.js";

export const postForumReply = async (
  id: string,
  body: any,
  files: any,
  userId: number
) => {
  const { description } = body;
  const limit = 20;

  if (!userId || !id || !description) {
    throw new Error("Missing required fields");
  }

  const [insertedForumReply] = await db
    .insert(forumReplies)
    .values({
      userId: Number(userId),
      forumCommentId: Number(id),
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  let newReplyMedia: any[] = [];
  if (files) {
    for (const file of files as Express.Multer.File[]) {
      try {
        const uniqueKey = `${insertedForumReply.id}-${crypto.randomUUID()}-${
          file.originalname
        }`;
        const url = await uploadImageToCloudflare(
          uniqueKey,
          file.buffer,
          file.mimetype
        );
        const [media] = await db
          .insert(forumReplyMedias)
          .values({
            forumReplyId: insertedForumReply.id,
            url: url,
            urlForDeletion: uniqueKey,
            mediaType: file.mimetype.startsWith("video") ? "video" : "image",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        newReplyMedia.push(media);
      } catch (error) {
        console.error("Error uploading file or saving media:", error);
      }
    }
  }
  const [username] = await db
    .select({
      firstName: users.firstName,
      lastName: users.lastName,
      profileImage: users.profileImage, // Add this line
    })
    .from(users)
    .where(eq(users.id, Number(userId)));
  const replyWithMedia = {
    id: insertedForumReply.id,
    userId: insertedForumReply.userId,
    forumCommentId: insertedForumReply.forumCommentId,
    description: insertedForumReply.description,
    createdAt: insertedForumReply.createdAt,
    updatedAt: insertedForumReply.updatedAt,
    username: username.firstName + " " + username.lastName,
    profileImage: username.profileImage, // Add this line
    media: newReplyMedia.map((m) => ({
      url: m.url,
      type: m.mediaType,
    })),
  };

  let { currentReplyAmount, lastPage } = JSON.parse(
    (await redis.get(`forumReplies:comment:${id}:lastPage`)) ||
      JSON.stringify({ currentReplyAmount: 0, lastPage: 1 })
  );

  // Determine which page to add the new reply
  if (currentReplyAmount >= limit) {
    lastPage += 1;
    currentReplyAmount = 1;
  } else {
    currentReplyAmount += 1;
  }

  const cacheKey = `forumReplies:comment:${id}:page:${lastPage}`;
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

  // Update last page info in Redis
  await redis.set(
    `forumReplies:comment:${id}:lastPage`,
    JSON.stringify({ currentReplyAmount, lastPage }),
    {
      EX: 600,
    }
  );

  return {
    data: {
      success: true,
      reply: insertedForumReply,
      newReplyMedia,
    },
  };
};
