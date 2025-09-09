import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/index.js";
import { blogs, blogMedia, users, userSavedBlogs } from "@/db/schema.js";
import {
  uploadImageToCloudflare,
  deleteFromCloudflare,
} from "@/db/cloudflare/cloudflareFunction.js";
import { redis } from "@/db/redis/redisConfig.js";

export const updateBlog = async (
  id: string,
  body: any,
  files: any,
  userId: number
) => {
  const { title, description, type, topic, photosToRemove } = body;

  const doesUserOwnThisBlog = await db
    .select()
    .from(blogs)
    .where(and(eq(blogs.id, Number(id)), eq(blogs.userId, Number(userId))))
    .limit(1);
  if (doesUserOwnThisBlog.length === 0) {
    throw new Error("Blog not found");
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
  let newBlogMedia: any[] = [];
  if (files) {
    for (const file of files as Express.Multer.File[]) {
      try {
        const uniqueKey = `${id}-${crypto.randomUUID()}-${file.originalname}`;
        const url = await uploadImageToCloudflare(
          uniqueKey,
          file.buffer,
          file.mimetype
        );
        const [newMedia] = await db
          .insert(blogMedia)
          .values({
            blogId: Number(id),
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

  let deleteMedia = null;
  if (photosToRemoveParse && photosToRemoveParse.length > 0) {
    const deleteResults = await Promise.all(
      photosToRemoveParse.map(async (photoToRemove: any) => {
        const urlForDeletion = await db
          .select({
            urlForDeletion: blogMedia.urlForDeletion,
          })
          .from(blogMedia)
          .where(eq(blogMedia.url, photoToRemove.url));
        let deleted = null;
        if (urlForDeletion[0]?.urlForDeletion) {
          await deleteFromCloudflare(
            "komplex-image",
            urlForDeletion[0].urlForDeletion
          );
          deleted = await db
            .delete(blogMedia)
            .where(
              and(
                eq(blogMedia.blogId, Number(id)),
                eq(blogMedia.urlForDeletion, urlForDeletion[0].urlForDeletion)
              )
            )
            .returning();
        }
        return deleted;
      })
    );

    deleteMedia = deleteResults.flat();
  }

  const updatedBlog = await db
    .update(blogs)
    .set({
      title,
      description,
      type,
      topic,
      updatedAt: new Date(),
    })
    .where(eq(blogs.id, Number(id)))
    .returning();

  const blog = await db
    .select({
      id: blogs.id,
      userId: blogs.userId,
      title: blogs.title,
      description: blogs.description,
      type: blogs.type,
      topic: blogs.topic,
      createdAt: blogs.createdAt,
      updatedAt: blogs.updatedAt,
      mediaUrl: blogMedia.url,
      mediaType: blogMedia.mediaType,
      username: sql`${users.firstName} || ' ' || ${users.lastName}`,
    })
    .from(blogs)
    .leftJoin(blogMedia, eq(blogs.id, blogMedia.blogId))
    .leftJoin(users, eq(blogs.userId, users.id))
    .where(eq(blogs.id, Number(id)));

  const blogWithMedia = {
    id: blog[0].id,
    userId: blog[0].userId,
    title: blog[0].title,
    description: blog[0].description,
    type: blog[0].type,
    topic: blog[0].topic,
    createdAt: blog[0].createdAt,
    updatedAt: blog[0].updatedAt,
    username: blog[0]?.username,
    media: blog
      .filter((b) => b.mediaUrl)
      .map((b) => ({
        url: b.mediaUrl,
        type: b.mediaType,
      })),
  };

  await redis.set(`blogs:${id}`, JSON.stringify(blogWithMedia), { EX: 600 });

  return { data: updatedBlog, newBlogMedia };
};

export const deleteBlog = async (id: string, userId: number) => {
  // Step 1: Verify blog ownership
  const doesUserOwnThisBlog = await db
    .select()
    .from(blogs)
    .where(and(eq(blogs.id, Number(id)), eq(blogs.userId, Number(userId))))
    .limit(1);

  if (doesUserOwnThisBlog.length === 0) {
    throw new Error("Blog not found");
  }

  // Step 2: Delete associated media (DB + Cloudinary)
  // Select associated media to delete from Cloudflare first
  const mediaToDelete = await db
    .select({
      urlToDelete: blogMedia.urlForDeletion,
    })
    .from(blogMedia)
    .where(eq(blogMedia.blogId, Number(id)));

  if (mediaToDelete && mediaToDelete.length > 0) {
    await Promise.all(
      mediaToDelete.map((media) =>
        deleteFromCloudflare("komplex-image", media.urlToDelete ?? "")
      )
    );
  }

  // Delete associated media from DB
  const deletedMedia = await db
    .delete(blogMedia)
    .where(eq(blogMedia.blogId, Number(id)))
    .returning();

  // Step 3: Delete blog saves
  await db.delete(userSavedBlogs).where(eq(userSavedBlogs.blogId, Number(id)));

  // Step 4: Delete blog itself
  const deletedBlog = await db
    .delete(blogs)
    .where(eq(blogs.id, Number(id)))
    .returning();

  await redis.del(`blogs:${id}`);
  await redis.del(`dashboardData:${userId}`);
  const redisKey = `userBlogs:${userId}:type:*:topic:*:page:*`;
  const myBlogKeys: string[] = await redis.keys(redisKey);
  if (myBlogKeys.length > 0) {
    await redis.del(myBlogKeys);
  }

  return {
    data: deletedBlog,
  };
};

export const saveBlog = async (id: string, userId: number) => {
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const blogToSave = await db.insert(userSavedBlogs).values({
    userId: Number(userId),
    blogId: Number(id),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return {
    data: blogToSave,
  };
};

export const unsaveBlog = async (id: string, userId: number) => {
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const blogToUnsave = await db
    .delete(userSavedBlogs)
    .where(
      and(
        eq(userSavedBlogs.userId, Number(userId)),
        eq(userSavedBlogs.blogId, Number(id))
      )
    )
    .returning();

  if (!blogToUnsave || blogToUnsave.length === 0) {
    throw new Error("Blog not found");
  }

  return {
    data: blogToUnsave,
  };
};
