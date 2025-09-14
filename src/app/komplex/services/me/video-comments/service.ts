import { db } from "@/db/index.js";
import { videoComments, videoCommentMedias, users } from "@/db/schema.js";
import { eq } from "drizzle-orm";
import { redis } from "@/db/redis/redisConfig.js";
import { uploadVideoToCloudflare } from "@/db/cloudflare/cloudflareFunction.js";

export const postVideoComment = async (
  id: string,
  userId: number,
  description: string,
  files: any
) => {
  if (!userId || !id || !description) {
    throw new Error("Missing required fields");
  }

  const [insertComment] = await db
    .insert(videoComments)
    .values({
      userId: Number(userId),
      videoId: Number(id),
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  let newCommentMedia: any[] = [];
  if (files) {
    for (const file of files as Express.Multer.File[]) {
      try {
        const uniqueKey = `${insertComment.id}-${crypto.randomUUID()}-${
          file.originalname
        }`;
        const url = await uploadVideoToCloudflare(
          uniqueKey,
          file.buffer,
          file.mimetype
        );
        const [media] = await db
          .insert(videoCommentMedias)
          .values({
            videoCommentId: insertComment.id,
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
    .select({ 
      firstName: users.firstName, 
      lastName: users.lastName,
      profileImage: users.profileImage // Add this line
    })
    .from(users)
    .where(eq(users.id, Number(userId)));
  const videoCommentWithMedia = {
    id: insertComment.id,
    userId: insertComment.userId,
    description: insertComment.description,
    createdAt: insertComment.createdAt,
    updatedAt: insertComment.updatedAt,
    username: username.firstName + " " + username.lastName,
    profileImage: username.profileImage, // Add this line
    media: newCommentMedia.map((m) => ({
      url: m.url,
      type: m.mediaType,
    })),
  };
  const limit = 20;
  let { currentCommentAmount, lastPage } = JSON.parse(
    (await redis.get(`videoComments:video:${id}:lastPage`)) ||
      JSON.stringify({ currentCommentAmount: 0, lastPage: 1 })
  );

  // Determine which page to add the new comment
  if (currentCommentAmount >= limit) {
    lastPage += 1;
    currentCommentAmount = 1;
  } else {
    currentCommentAmount += 1;
  }

  const cacheKey = `videoComments:video:${id}:page:${lastPage}`;

  const cached = await redis.get(cacheKey);

  if (cached) {
    const parsed = JSON.parse(cached);
    parsed.commentsWithMedia.push(videoCommentWithMedia);
    await redis.set(cacheKey, JSON.stringify(parsed), { EX: 600 });
  } else {
    await redis.set(
      cacheKey,
      JSON.stringify({ commentsWithMedia: [videoCommentWithMedia] }),
      { EX: 600 }
    );
  }

  await redis.set(
    `videoComments:video:${id}:lastPage`,
    JSON.stringify({ currentCommentAmount, lastPage }),
    {
      EX: 600,
    }
  );

  return {
    data: {
      success: true,
      comment: insertComment,
      newCommentMedia,
    },
  };
};
