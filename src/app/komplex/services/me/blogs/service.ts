import { eq, sql } from "drizzle-orm";
import { db } from "@/db/index.js";
import { redis } from "@/db/redis/redisConfig.js";
import { blogs, blogMedia, users } from "@/db/schema.js";
import { uploadImageToCloudflare } from "@/db/cloudflare/cloudflareFunction.js";

export const getAllUserBlogs = async (userId: number) => {
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

  return { data: blogsWithMedia };
};

export const postBlog = async (body: any, files: any, userId: number) => {
  const { title, description, type, topic } = body;

  if (!userId || !title || !description) {
    throw new Error("Missing required fields");
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
  if (files) {
    for (const file of files as Express.Multer.File[]) {
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

  return { data: { success: true, newBlog, newBlogMedia } };
};
