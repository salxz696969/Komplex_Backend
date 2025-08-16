import { Request, Response } from "express";
import { deleteFromCloudinary, uploadToCloudinary } from "../../db/cloudinary/cloundinaryFunction";
import { db } from "../../db";
import { blogs, mediaTypeEnum, users, userSavedBlogs } from "../../db/schema";
import { and, eq } from "drizzle-orm";
import { blogMedia } from "../../db/models/blog_media";
import { create } from "domain";
import { sql } from "drizzle-orm";
interface AuthenticatedRequest extends Request {
	user?: {
		userId: string;
		// add other user properties if needed
	};
}

export const postBlog = async (req: AuthenticatedRequest, res: Response) => {
	let public_url: string[] = [];
	let mediaType: ("image" | "video")[] = [];

	try {
		// Handle optional file upload
		if (Array.isArray(req.files) && req.files.length > 0) {
			for (const file of req.files) {
				const result = await uploadToCloudinary(file.buffer, "my_app_uploads", "auto");
				public_url.push((result as { secure_url: string }).secure_url);

				mediaType.push(file.mimetype.startsWith("video") ? "video" : "image");
			}
		}

		const { userId } = req.user ?? { userId: 1 };
		const { title, description, type, topic } = req.body;

		if (!userId || !title || !description) {
			return res.status(400).json({ success: false, message: "Missing required fields" });
		}

		// Insert blog
		const newBlog = await db
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
		let newBlogMedia = null;
		if (public_url.length > 0 && mediaType.length > 0) {
			for (let i = 0; i < public_url.length; i++) {
				newBlogMedia = await db.insert(blogMedia).values({
					blogId: newBlog[0].id,
					url: public_url[i],
					mediaType: mediaType[i],
					createdAt: new Date(),
					updatedAt: new Date(),
				});
			}
		}

		return res.status(201).json({
			success: true,
			newBlog,
			newBlogMedia,
			mediaType,
		});
	} catch (error) {
		// Clean up uploaded file if DB insert failed
		if (public_url.length > 0 && mediaType.length > 0) {
			try {
				for (let i = 0; i < public_url.length; i++) {
					await deleteFromCloudinary(public_url[i], mediaType[i]);
				}
			} catch (err) {
				console.error("Failed to delete uploaded media:", err);
			}
		}

		console.error(error);
		return res.status(500).json({ success: false, error: (error as Error).message });
	}
};

export const getAllBlogs = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { type, topic } = req.query;
		const { userId } = req.user ?? { userId: 1 };
		const conditions = [];
		if (type) conditions.push(eq(blogs.type, type as string));
		if (topic) conditions.push(eq(blogs.topic, topic as string));

		const blog = await db
			.select({
				id: blogs.id,
				userId: blogs.userId,
				title: blogs.title,
				description: blogs.description,
				type: blogs.type,
				topic: blogs.topic,
				viewCount: blogs.viewCount,
				likeCount: blogs.likeCount,
				createdAt: blogs.createdAt,
				updatedAt: blogs.updatedAt,
				mediaUrl: blogMedia.url,
				mediaType: blogMedia.mediaType,
				userName: sql`${users.firstName} || ' ' || ${users.lastName}`,
				isSave: sql`CASE WHEN ${userSavedBlogs.blogId} IS NOT NULL THEN true ELSE false END`,
			})
			.from(blogs)
			.leftJoin(blogMedia, eq(blogs.id, blogMedia.blogId))
			.leftJoin(users, eq(blogs.userId, users.id))
			.leftJoin(userSavedBlogs, and(eq(userSavedBlogs.blogId, blogs.id), eq(userSavedBlogs.userId, Number(userId))))
			.where(conditions.length > 0 ? and(...conditions) : undefined);

		const blogsWithMedia = Object.values(
			blog.reduce((acc, blog) => {
				if (!acc[blog.id]) {
					acc[blog.id] = {
						id: blog.id,
						userId: blog.userId,
						title: blog.title,
						description: blog.description,
						type: blog.type,
						topic: blog.topic,
						viewCount: blog.viewCount,
						likeCount: blog.likeCount,
						createdAt: blog.createdAt,
						updatedAt: blog.updatedAt,
						userName: blog.userName,
						isSave: !!blog.isSave,
						media: [] as { url: string; type: string }[],
					};
				}

				if (blog.mediaUrl) {
					acc[blog.id].media.push({
						url: blog.mediaUrl,
						type: blog.mediaType,
					});
				}
				return acc;
			}, {} as { [key: number]: any })
		) as Record<number, any>[];

		return res.status(200).json({ blogsWithMedia });
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
		const userId = (req as any).user?.userId ?? "1";

		const blog = await db
			.select({
				id: blogs.id,
				userId: blogs.userId,
				title: blogs.title,
				description: blogs.description,
				type: blogs.type,
				topic: blogs.topic,
				viewCount: blogs.viewCount,
				likeCount: blogs.likeCount,
				createdAt: blogs.createdAt,
				updatedAt: blogs.updatedAt,
				mediaUrl: blogMedia.url,
				mediaType: blogMedia.mediaType,
				userName: sql`${users.firstName} || ' ' || ${users.lastName}`,
				isSave: sql`CASE WHEN ${userSavedBlogs.blogId} IS NOT NULL THEN true ELSE false END`,
			})
			.from(blogs)
			.leftJoin(blogMedia, eq(blogs.id, blogMedia.blogId))
			.leftJoin(users, eq(blogs.userId, users.id))
			.leftJoin(userSavedBlogs, and(eq(userSavedBlogs.blogId, blogs.id), eq(userSavedBlogs.userId, Number(userId))))
			.where(eq(blogs.id, Number(id)));

		if (!blog || blog.length === 0) {
			return res.status(404).json({ success: false, message: "Blog not found" });
		}

		// Increment view count
		await db
			.update(blogs)
			.set({ viewCount: (blog[0]?.viewCount ?? 0) + 1, updatedAt: new Date() })
			.where(eq(blogs.id, Number(id)));

		const blogWithMedia = {
			id: blog[0].id,
			userId: blog[0].userId,
			title: blog[0].title,
			description: blog[0].description,
			type: blog[0].type,
			topic: blog[0].topic,
			viewCount: (blog[0]?.viewCount ?? 0) + 1,
			likeCount: blog[0].likeCount,
			createdAt: blog[0].createdAt,
			updatedAt: new Date(),
			userName: blog[0].userName,
			isSave: !!blog[0].isSave,
			media: blog
				.filter((b) => b.mediaUrl)
				.map((b) => ({
					url: b.mediaUrl,
					type: b.mediaType,
				})),
		};

		return res.status(200).json({ blog: blogWithMedia });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const saveBlog = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: "1" };

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		const blogToSave = await db.insert(userSavedBlogs).values({
			userId: Number(userId),
			blogId: Number(id),
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		return res.status(200).json({
			success: true,
			message: "Blog saved successfully",
			blog: blogToSave,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const unsaveBlog = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: "1" };

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		const blogToUnsave = await db
			.delete(userSavedBlogs)
			.where(and(eq(userSavedBlogs.userId, Number(userId)), eq(userSavedBlogs.blogId, Number(id))))
			.returning();

		if (!blogToUnsave || blogToUnsave.length === 0) {
			return res.status(404).json({ success: false, message: "Blog not found" });
		}

		return res.status(200).json({
			success: true,
			message: "Blog unsaved successfully",
			blog: blogToUnsave,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const updateBlog = async (req: AuthenticatedRequest, res: Response) => {
	let public_url: string[] = [];
	let mediaType: ("image" | "video")[] = [];
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params;
		const { title, description, type, topic, isRemovePhoto } = req.body;
		if (Array.isArray(req.files) && req.files.length > 0) {
			for (const file of req.files) {
				const result = await uploadToCloudinary(file.buffer, "my_app_uploads", "auto");
				public_url.push((result as { secure_url: string }).secure_url);

				mediaType.push(file.mimetype.startsWith("video") ? "video" : "image");
			}
		}
		let handleIfUserSendIsRemovePhotoTrueAndUploadMedia = isRemovePhoto;
		if (public_url.length === 0 && mediaType.length === 0 && isRemovePhoto)
			handleIfUserSendIsRemovePhotoTrueAndUploadMedia = false;
		const doesUserOwnThisBlog = await db
			.select()
			.from(blogs)
			.where(and(eq(blogs.id, Number(id)), eq(blogs.userId, Number(userId))))
			.limit(1);
		if (doesUserOwnThisBlog.length === 0) {
			return res.status(404).json({ success: false, message: "Blog not found" });
		}

		if (handleIfUserSendIsRemovePhotoTrueAndUploadMedia) {
			const deletedMedia = await db
				.delete(blogMedia)
				.where(eq(blogMedia.blogId, Number(id)))
				.returning({ url: blogMedia.url });

			const mediaUrls = deletedMedia.map((m) => m.url);
			for (const mediaUrl of mediaUrls) {
				await deleteFromCloudinary(mediaUrl ?? "", undefined);
			}
		}

		const updateBlog = await db
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

		if (public_url.length > 0) {
			const deletedMedia = await db
				.delete(blogMedia)
				.where(eq(blogMedia.blogId, Number(id)))
				.returning({ url: blogMedia.url });

			const mediaUrls = deletedMedia.map((m) => m.url);
			for (const mediaUrl of mediaUrls) {
				await deleteFromCloudinary(mediaUrl ?? "", undefined);
			}

			const addToBlogMedia = await db
				.insert(blogMedia)
				.values(
					public_url.map((url, index) => ({
						blogId: Number(id),
						url,
						mediaType: mediaType[index],
						createdAt: new Date(),
						updatedAt: new Date(),
					}))
				)
				.returning();
			const updateBlogWithMedia = await Promise.all(
				addToBlogMedia.map(async (media) => {
					const mediaDetails = await db.select().from(blogMedia).where(eq(blogMedia.id, media.id));
					return {
						...media,
						mediaType: mediaDetails[0].mediaType,
					};
				})
			);
			return res.status(200).json({
				updateBlogWithMedia,
			});
		}
		return res.status(200).json({ updateBlog });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const deleteBlog = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params;

		// Step 1: Verify blog ownership
		const blogRecord = await db
			.select()
			.from(blogs)
			.where(and(eq(blogs.id, Number(id)), eq(blogs.userId, Number(userId))))
			.limit(1);

		if (blogRecord.length === 0) {
			return res.status(404).json({ success: false, message: "Blog not found" });
		}

		// Step 2: Delete associated media (DB + Cloudinary)
		const deletedMedia = await db
			.delete(blogMedia)
			.where(eq(blogMedia.blogId, Number(id)))
			.returning({ url: blogMedia.url });

		for (const media of deletedMedia) {
			await deleteFromCloudinary(media.url ?? "", undefined);
		}

		// Step 3: Delete blog saves
		await db.delete(userSavedBlogs).where(eq(userSavedBlogs.blogId, Number(id)));

		// Step 4: Delete blog itself
		const deletedBlog = await db
			.delete(blogs)
			.where(eq(blogs.id, Number(id)))
			.returning();

		// Step 4: Response
		return res.status(200).json({
			success: true,
			message: "Blog deleted successfully",
			deletedBlog,
			deletedMedia,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};
