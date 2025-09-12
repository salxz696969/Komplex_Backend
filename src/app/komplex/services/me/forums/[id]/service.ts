import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/index.js";
import {
  forums,
  forumMedias,
  users,
  forumLikes,
  forumComments,
} from "@/db/schema.js";
import {
  uploadImageToCloudflare,
  deleteFromCloudflare,
} from "@/db/cloudflare/cloudflareFunction.js";
import { deleteReply } from "../../forum-replies/[id]/service.js";
import { deleteComment } from "../../forum-comments/[id]/service.js";
import { redis } from "@/db/redis/redisConfig.js";
import { meilisearch } from "@/config/meilisearchConfig.js";

export const updateForum = async (
  id: string,
  body: any,
  files: any,
  userId: number
) => {
  const { title, description, type, topic, photosToRemove } = body;

  const doesUserOwnThisForum = await db
    .select()
    .from(forums)
    .where(and(eq(forums.id, Number(id)), eq(forums.userId, Number(userId))))
    .limit(1);
  if (doesUserOwnThisForum.length === 0) {
    throw new Error("Forum not found");
  }

  let photosToRemoveParse: { url: string }[] = [];
  if (photosToRemove) {
    try {
      photosToRemoveParse = JSON.parse(photosToRemove);
    } catch (err) {
      console.error("Error parsing photosToRemove:", err);
      throw new Error("Invalid photosToRemove format");
    }
  }
  let newForumMedia: any[] = [];
  if (files) {
    for (const file of files as Express.Multer.File[]) {
      try {
        const uniqueKey = `${id}-${crypto.randomUUID()}-${file.originalname}`;
        const url = await uploadImageToCloudflare(
          uniqueKey,
          file.buffer,
          file.mimetype
        );
        const [media] = await db
          .insert(forumMedias)
          .values({
            forumId: Number(id),
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

  let deleteMedia = null;
  if (photosToRemoveParse && photosToRemoveParse.length > 0) {
    const deleteResults = await Promise.all(
      photosToRemoveParse.map(async (photoToRemove: any) => {
        const urlForDeletion = await db
          .select({
            urlForDeletion: forumMedias.urlForDeletion,
          })
          .from(forumMedias)
          .where(eq(forumMedias.url, photoToRemove.url));
        let deleted = null;
        if (urlForDeletion[0]?.urlForDeletion) {
          await deleteFromCloudflare(
            "komplex-image",
            urlForDeletion[0].urlForDeletion
          );
          deleted = await db
            .delete(forumMedias)
            .where(
              and(
                eq(forumMedias.forumId, Number(id)),
                eq(forumMedias.urlForDeletion, urlForDeletion[0].urlForDeletion)
              )
            )
            .returning();
        }
        return deleted;
      })
    );

    deleteMedia = deleteResults.flat();
  }

  const [updateForum] = await db
    .update(forums)
    .set({
      title,
      description,
      type,
      topic,
      updatedAt: new Date(),
    })
    .where(eq(forums.id, Number(id)))
    .returning();

  const forum = await db
    .select({
      id: forums.id,
      userId: forums.userId,
      title: forums.title,
      description: forums.description,
      type: forums.type,
      topic: forums.topic,
      createdAt: forums.createdAt,
      updatedAt: forums.updatedAt,
      mediaUrl: forumMedias.url,
      mediaType: forumMedias.mediaType,
      username: sql`${users.firstName} || ' ' || ${users.lastName}`,
    })
    .from(forums)
    .leftJoin(forumMedias, eq(forums.id, forumMedias.forumId))
    .leftJoin(users, eq(forums.userId, users.id))
    .where(eq(forums.id, Number(id)));

  const forumWithMedia = {
    id: forum[0].id,
    userId: forum[0].userId,
    title: forum[0].title,
    description: forum[0].description,
    type: forum[0].type,
    topic: forum[0].topic,
    createdAt: forum[0].createdAt,
    updatedAt: forum[0].updatedAt,
    username: forum[0]?.username,
    media: forum
      .filter((b) => b.mediaUrl)
      .map((b) => ({
        url: b.mediaUrl,
        type: b.mediaType,
      })),
  };

  const meilisearchData = {
    id: forumWithMedia.id,
    title: forumWithMedia.title,
    description: forumWithMedia.description,
    type: forumWithMedia.type,
    topic: forumWithMedia.topic,
  };
  await meilisearch.index("forums").addDocuments([meilisearchData]);
  await redis.set(`forums:${id}`, JSON.stringify(forumWithMedia), {
    EX: 600,
  });
  await redis.del(`dashboardData:${userId}`);
  const myForumKeys: string[] = await redis.keys(
    `myForums:${userId}:type:*:topic:*`
  );

  if (myForumKeys.length > 0) {
    await redis.del(myForumKeys);
  }
  return { data: { updateForum, newForumMedia, deleteMedia } };
};

export const deleteForum = async (id: string, userId: number) => {
  // Step 1: Verify forum ownership
  const doesUserOwnThisForum = await db
    .select()
    .from(forums)
    .where(and(eq(forums.id, Number(id)), eq(forums.userId, Number(userId))))
    .limit(1);

  if (doesUserOwnThisForum.length === 0) {
    throw new Error("Forum not found");
  }

  // Step 2: Delete associated media (DB + Cloudflare)
  const mediaToDelete = await db
    .select({
      urlToDelete: forumMedias.urlForDeletion,
    })
    .from(forumMedias)
    .where(eq(forumMedias.forumId, Number(id)));

  if (mediaToDelete && mediaToDelete.length > 0) {
    await Promise.all(
      mediaToDelete.map((media) =>
        deleteFromCloudflare("komplex-image", media.urlToDelete ?? "")
      )
    );
  }

  const deletedMedia = await db
    .delete(forumMedias)
    .where(eq(forumMedias.forumId, Number(id)))
    .returning();

  // Step 3: Delete forum comments and replies
  const commentRecords = await db
    .select()
    .from(forumComments)
    .where(eq(forumComments.forumId, Number(id)));
  let deleteReplies = null;
  let deleteComments = null;
  if (commentRecords.length > 0) {
    for (const commentRecord of commentRecords) {
      deleteReplies = await deleteReply(Number(userId), null, commentRecord.id);
    }
    deleteComments = await deleteComment(Number(userId), null, Number(id));
  }

  // Step 4: Delete forum itself
  const deletedForum = await db
    .delete(forums)
    .where(eq(forums.id, Number(id)))
    .returning();

  await redis.del(`forums:${id}`);
  const myForumKeys: string[] = await redis.keys(
    `myForums:${userId}:type:*:topic:*`
  );

  if (myForumKeys.length > 0) {
    await redis.del(myForumKeys);
  }
  await redis.del(`dashboardData:${userId}`);

  await meilisearch.index("forums").deleteDocument(String(id));

  return {
    data: {
      success: true,
      message: "Forum deleted successfully",
      deletedForum,
      deletedMedia,
      deleteReplies,
      deleteComments,
    },
  };
};

export const likeForum = async (id: string, userId: number) => {
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const like = await db
    .insert(forumLikes)
    .values({
      userId: Number(userId),
      forumId: Number(id),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return { data: { like } };
};

export const unlikeForum = async (id: string, userId: number) => {
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const unlike = await db
    .delete(forumLikes)
    .where(
      and(
        eq(forumLikes.userId, Number(userId)),
        eq(forumLikes.forumId, Number(id))
      )
    )
    .returning();

  return { data: { unlike } };
};
