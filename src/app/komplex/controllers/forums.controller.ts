import { eq, and, inArray, sql } from "drizzle-orm";
import { forumComments, forumLikes, forumMedias, forumReplies, forums, users } from "../../../db/schema";
import { db } from "../../../db/index";
import { Request, Response } from "express";
import { deleteFromCloudinary, uploadToCloudinary } from "../../../db/cloudinary/cloundinaryFunction";
import { deleteReply } from "./forum_replies.controller";
import { deleteComment } from "./forum_comments.controller";

interface AuthenticatedRequest extends Request {
	user?: {
		userId: string;
		// add other user properties if needed
	};
}

export const getAllForums = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { type, topic } = req.query;
		const { userId } = req.user ?? { userId: 1 };
		const conditions = [];
		if (type) conditions.push(eq(forums.type, type as string));
		if (topic) conditions.push(eq(forums.topic, topic as string));

		const forumRecords = await db
			.select({
				id: forums.id,
				userId: forums.userId,
				title: forums.title,
				description: forums.description,
				type: forums.type,
				topic: forums.topic,
				viewCount: forums.viewCount,
				createdAt: forums.createdAt,
				updatedAt: forums.updatedAt,
				mediaUrl: forumMedias.url,
				mediaType: forumMedias.mediaType,
				username: sql`${users.firstName} || ' ' || ${users.lastName}`, // Uncomment if you join users
				isLike: sql`CASE WHEN ${forumLikes.forumId} IS NOT NULL THEN true ELSE false END`, // Uncomment if you join userSavedForums
				// Add more fields if needed, e.g. username, isSave, etc.
			})
			.from(forums)
			.leftJoin(forumMedias, eq(forums.id, forumMedias.forumId))
			.leftJoin(users, eq(forums.userId, users.id)) // Uncomment if you want user info
			.leftJoin(forumLikes, and(eq(forumLikes.forumId, forums.id), eq(forumLikes.userId, Number(userId))))
			.where(conditions.length > 0 ? and(...conditions) : undefined);

		const forumsWithMedia = Object.values(
			forumRecords.reduce((acc, forum) => {
				if (!acc[forum.id]) {
					acc[forum.id] = {
						id: forum.id,
						userId: forum.userId,
						title: forum.title,
						description: forum.description,
						type: forum.type,
						topic: forum.topic,
						viewCount: forum.viewCount,
						createdAt: forum.createdAt,
						updatedAt: forum.updatedAt,
						media: [] as { url: string; type: string }[],
						username: forum.username, // Uncomment if you join users
						isLike: !!forum.isLike, // Uncomment if you join userSavedForums
					};
				}
				if (forum.mediaUrl) {
					acc[forum.id].media.push({
						url: forum.mediaUrl,
						type: forum.mediaType,
					});
				}
				return acc;
			}, {} as { [key: number]: any })
		) as Record<number, any>[];

		return res.status(200).json({ forumsWithMedia });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const getForumById = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: "1" };

		const forumRecords = await db
			.select({
				id: forums.id,
				userId: forums.userId,
				title: forums.title,
				description: forums.description,
				type: forums.type,
				topic: forums.topic,
				viewCount: forums.viewCount,
				createdAt: forums.createdAt,
				updatedAt: forums.updatedAt,
				mediaUrl: forumMedias.url,
				mediaType: forumMedias.mediaType,
				username: sql`${users.firstName} || ' ' || ${users.lastName}`, // Uncomment if you join users
				isLike: sql`CASE WHEN ${forumLikes.forumId} IS NOT NULL THEN true ELSE false END`, // Uncomment if you join userSavedForums
			})
			.from(forums)
			.leftJoin(forumMedias, eq(forums.id, forumMedias.forumId))
			.leftJoin(users, eq(forums.userId, users.id)) // Uncomment if you want user info
			.leftJoin(forumLikes, and(eq(forumLikes.forumId, forums.id), eq(forumLikes.userId, Number(userId))))
			.where(eq(forums.id, Number(id)));

		if (!forumRecords || forumRecords.length === 0) {
			return res.status(404).json({ success: false, message: "Forum not found" });
		}

		// Increment view count
		await db
			.update(forums)
			.set({
				viewCount: (forumRecords[0]?.viewCount ?? 0) + 1,
				updatedAt: new Date(),
			})
			.where(eq(forums.id, Number(id)));

		const forumWithMedia = {
			id: forumRecords[0].id,
			userId: forumRecords[0].userId,
			title: forumRecords[0].title,
			description: forumRecords[0].description,
			type: forumRecords[0].type,
			topic: forumRecords[0].topic,
			viewCount: (forumRecords[0]?.viewCount ?? 0) + 1,
			createdAt: forumRecords[0].createdAt,
			updatedAt: new Date(),
			media: forumRecords
				.filter((f) => f.mediaUrl)
				.map((f) => ({
					url: f.mediaUrl,
					type: f.mediaType,
				})),
			username: forumRecords[0].username, // Uncomment if you join users
			isLike: !!forumRecords[0].isLike, // Uncomment if you join userSavedForums
		};

		return res.status(200).json({ forum: forumWithMedia });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const postForum = async (req: AuthenticatedRequest, res: Response) => {
	let secure_url: string[] = [];
	let public_id: string[] = [];
	let mediaType: ("image" | "video")[] = [];

	try {
		// Handle optional file upload
		if (Array.isArray(req.files) && req.files.length > 0) {
			const files = req.files as Express.Multer.File[];
			const uploadResults = await Promise.all(
				files.map((file) => uploadToCloudinary(file.buffer, "my_app_uploads", "auto"))
			);

			uploadResults.forEach((result, index) => {
				secure_url.push((result as { secure_url: string }).secure_url);
				public_id.push((result as { public_id: string }).public_id);
				mediaType.push(files[index].mimetype.startsWith("video") ? "video" : "image");
			});
			console.log("Cloudinary public_id:", public_id);
		}

		const { userId } = req.user ?? { userId: 1 };
		const { title, description, type, topic } = req.body;

		if (!userId || !title || !description) {
			return res.status(400).json({ success: false, message: "Missing required fields" });
		}

		// Insert forum
		const newForum = await db
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
		let newForumMedia = null;
		if (secure_url.length > 0 && mediaType.length > 0) {
			for (let i = 0; i < secure_url.length; i++) {
				newForumMedia = await db.insert(forumMedias).values({
					forumId: newForum[0].id,
					url: secure_url[i],
					urlForDeletion: public_id[i], // Save public_id for deletion
					mediaType: mediaType[i],
					createdAt: new Date(),
					updatedAt: new Date(),
				});
			}
		}
		return res.status(201).json({
			success: true,
			forum: newForum,
			media: newForumMedia,
			mediaType,
			public_id,
		});
	} catch (error) {
		// Clean up uploaded files if DB insert failed
		if (public_id.length > 0 && mediaType.length > 0) {
			try {
				await Promise.all(public_id.map((url, index) => deleteFromCloudinary(url, mediaType[index])));
			} catch (err) {
				console.error("Failed to delete uploaded media:", err);
			}
		}

		console.error(error);
		return res.status(500).json({ success: false, error: (error as Error).message });
	}
};

export const likeForum = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: 1 };

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
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

		return res.status(200).json({ like });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const unlikeForum = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: 1 };

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		const unlike = await db
			.delete(forumLikes)
			.where(and(eq(forumLikes.userId, Number(userId)), eq(forumLikes.forumId, Number(id))))
			.returning();

		return res.status(200).json({ unlike });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const updateForum = async (req: AuthenticatedRequest, res: Response) => {
	let public_id: string[] = [];
	let secure_url: string[] = [];
	let mediaType: ("image" | "video")[] = [];
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params;
		const { title, description, type, topic, photosToRemove } = req.body;

		let photosToRemoveParse: { url: string }[] = [];
		if (photosToRemove) {
			try {
				photosToRemoveParse = JSON.parse(photosToRemove);
			} catch (err) {
				return res.status(400).json({ success: false, message: "Invalid photosToRemove format" });
			}
		}

		if (Array.isArray(req.files) && req.files.length > 0) {
			const files = req.files as Express.Multer.File[];
			const uploadResults = await Promise.all(
				files.map((file) => uploadToCloudinary(file.buffer, "my_app_uploads", "auto"))
			);

			uploadResults.forEach((result, index) => {
				secure_url.push((result as { secure_url: string }).secure_url);
				public_id.push((result as { public_id: string }).public_id);
				mediaType.push(files[index].mimetype.startsWith("video") ? "video" : "image");
			});
		}

		const doesUserOwnThisForum = await db
			.select()
			.from(forums)
			.where(and(eq(forums.id, Number(id)), eq(forums.userId, Number(userId))))
			.limit(1);

		if (doesUserOwnThisForum.length === 0) {
			return res.status(404).json({ success: false, message: "Forum not found" });
		}

		let deleteMedia = null;
		if (photosToRemoveParse && photosToRemoveParse.length > 0) {
			const deleteResults = await Promise.all(
				photosToRemoveParse.map(async (photoToRemove) => {
					await deleteFromCloudinary(photoToRemove.url ?? "", undefined);
					const deleted = await db
						.delete(forumMedias)
						.where(
							and(eq(forumMedias.forumId, Number(id)), eq(forumMedias.urlForDeletion, photoToRemove.url))
						)
						.returning();
					return deleted;
				})
			);
			deleteMedia = deleteResults.flat();
		}

		let newForumMedia = null;
		if (secure_url.length > 0) {
			newForumMedia = await db
				.insert(forumMedias)
				.values(
					secure_url.map((url, index) => ({
						forumId: Number(id),
						url,
						urlForDeletion: public_id[index],
						mediaType: mediaType[index],
						createdAt: new Date(),
						updatedAt: new Date(),
					}))
				)
				.returning();
		}

		const updateForum = await db
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

		return res.status(200).json({ updateForum, newForumMedia, deleteMedia });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const deleteForum = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params; // id = commentId

		const commentRecords = await db
			.select()
			.from(forumComments)
			.where(and(eq(forumComments.forumId, Number(id)), eq(forumComments.userId, Number(userId))));
		let deleteReplies = null;
		let deleteComments = null;
		if (commentRecords.length > 0) {
			for (const commentRecord of commentRecords) {
				deleteReplies = await deleteReply(Number(userId), null, commentRecord.id);
			}
			deleteComments = await deleteComment(Number(userId), null, Number(id));
		}
		const delForum = await deleteForumFunction(Number(userId), Number(id));
		return res.json({
			success: true,
			deleteReplies,
			deleteComments,
			delForum,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

const deleteForumFunction = async (userId: number, id: number) => {
	// Delete associated media
	const deletedMedia = await db
		.delete(forumMedias)
		.where(eq(forumMedias.forumId, id))
		.returning({ url: forumMedias.url, mediaType: forumMedias.mediaType });
	for (const media of deletedMedia) {
		await deleteFromCloudinary(media.url ?? "", media.mediaType ?? undefined);
	}

	// Delete the forum itself
	const deletedForum = await db
		.delete(forums)
		.where(and(eq(forums.id, id), eq(forums.userId, userId)))
		.returning();

	console.log(deleteForum);

	return { deletedForum, deletedMedia };
};
