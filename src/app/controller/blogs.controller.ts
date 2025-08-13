import { Request, Response } from "express";
import { deleteFromCloudinary, uploadToCloudinary } from "../../db/cloudinary/cloundinaryFunction";
import { db } from "../../db";
import { blogs, mediaTypeEnum } from "../../db/schema";
import { and, eq } from "drizzle-orm";
import { blogMedia } from "../../db/models/blog_media";
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

export const getAllBlogs = async (req: Request, res: Response) => {
	try {
		const { type, topic } = req.query;

		const conditions = [];
		if (type) conditions.push(eq(blogs.type, type as string));
		if (topic) conditions.push(eq(blogs.topic, topic as string));

		const blog =
			conditions.length > 0
				? await db
						.select()
						.from(blogs)
						.where(and(...conditions))
				: await db.select().from(blogs);

		return res.json(blog).status(200);
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

		const blog = await db
			.select()
			.from(blogs)
			.where(eq(blogs.id, Number(id)))
			.limit(1);

		if (!blog || blog.length === 0 || !blog[0]) {
			return res.status(404).json({ success: false, message: "Blog not found" });
		}

		if (blog && blog.length > 0 && blog[0]) {
			await db
				.update(blogs)
				.set({ viewCount: (blog[0]?.viewCount ?? 0) + 1, updatedAt: new Date() })
				.where(eq(blogs.id, Number(id)))
				.returning();
		}

		return res.json(blog).status(200);
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const likeBlog = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.body;
		const { userId } = req.user ?? {};

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		const blog = await db
			.select()
			.from(blogs)
			.where(eq(blogs.id, Number(id)))
			.limit(1);

		if (!blog || blog.length === 0 || !blog[0]) {
			return res.status(404).json({ success: false, message: "Blog not found" });
		}

		return res.json(blog).status(200);
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const updateBlog = async (req: AuthenticatedRequest, res: Response) => {
	const { userId } = req.user ?? {};
	const { id } = req.params;
	try {
		const blogToUpdate = await db
			.select()
			.from(blogs)
			.where(and(eq(blogs.id, Number(id)), eq(blogs.userId, Number(userId))))
			.limit(1);
		if (blogToUpdate.length === 0) {
			return res.status(404).json({ success: false, message: "Blog not found" });
		}
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}

	try {
		let public_url: string | null = null;
		let mediaType: "image" | "video" | null = null;

		// If a file is uploaded, upload to Cloudinary
		if (req.file) {
			const result = (await uploadToCloudinary(req.file.buffer, "my_app_uploads", "auto")) as {
				public_url: string;
			};
			public_url = result.public_url;
			mediaType = req.file.mimetype.startsWith("video") ? "video" : "image";
		}

		const { title, description, type, topic } = req.body;

		// Validate required fields
		if (!title || !description) {
			return res.status(400).json({ success: false, message: "Missing required fields" });
		}

		const updatedBlogs = await db
			.update(blogs)
			.set({
				userId: Number(userId),
				title,
				description,
				type,
				topic,
				updatedAt: new Date(),
			})
			.where(eq(blogs.id, Number(id)))
			.returning();
		const newBlog = updatedBlogs[0];

		let newMedia = null;

		// Only create/update media entry if file exists
		if (public_url && mediaType) {
			const oldMediaUrl = await db.select().from(blogMedia).where(eq(blogMedia.blogId, newBlog.id));
			if (oldMediaUrl && oldMediaUrl.length > 0) {
				await deleteFromCloudinary(oldMediaUrl[0].url ?? "", oldMediaUrl[0].mediaType ?? undefined);
			}
			newMedia = await db
				.update(blogMedia)
				.set({
					url: public_url,
					mediaType,
				})
				.where(eq(blogMedia.blogId, newBlog.id))
				.returning();
		}

		if (!updatedBlogs || updatedBlogs.length === 0) {
			return res.status(404).json({ success: false, message: "Blog not found" });
		}

		return res.status(200).json(updatedBlogs[0]);
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const deleteBlog = async (req: AuthenticatedRequest, res: Response) => {
	const { userId } = req.user ?? {};
	const { id } = req.params;
	try {
		const blogToDelete = await db
			.select()
			.from(blogs)
			.where(and(eq(blogs.id, Number(id)), eq(blogs.userId, Number(userId))))
			.limit(1);
		if (blogToDelete.length === 0) {
			return res.status(404).json({ success: false, message: "Blog not found" });
		}
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}

	try {
		const blogToDelete = await db
			.select()
			.from(blogs)
			.where(and(eq(blogs.id, Number(id)), eq(blogs.userId, Number(userId))))
			.limit(1);
		if (blogToDelete.length === 0) {
			return res.status(404).json({ success: false, message: "Blog not found" });
		}

		const mediaUrl = await db
			.select()
			.from(blogMedia)
			.where(eq(blogMedia.blogId, Number(id)));

		if (mediaUrl && mediaUrl.length > 0) {
			await deleteFromCloudinary(mediaUrl[0].url ?? "", mediaUrl[0].mediaType ?? undefined);
		}

		await db.delete(blogs).where(eq(blogs.id, Number(id)));

		return res.status(200).json({ success: true, message: "Blog deleted successfully" });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};
