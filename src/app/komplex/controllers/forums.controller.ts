import { eq, and, inArray, sql, like } from "drizzle-orm";
import { forumComments, forumLikes, forumMedias, forumReplies, forums, users } from "../../../db/schema";
import { db } from "../../../db/index";
import { Request, Response } from "express";
import { deleteFromCloudflare, uploadImageToCloudflare } from "../../../db/cloudflare/cloudflareFunction";
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
				likeCount: sql`COUNT(DISTINCT ${forumLikes.id})`,
				username: sql`${users.firstName} || ' ' || ${users.lastName}`, // Uncomment if you join users
				isLike: sql`CASE WHEN ${forumLikes.forumId} IS NOT NULL THEN true ELSE false END`, // Uncomment if you join userSavedForums
				// Add more fields if needed, e.g. username, isSave, etc.
			})
			.from(forums)
			.leftJoin(forumMedias, eq(forums.id, forumMedias.forumId))
			.leftJoin(users, eq(forums.userId, users.id)) // Uncomment if you want user info
			.leftJoin(forumLikes, and(eq(forumLikes.forumId, forums.id), eq(forumLikes.userId, Number(userId))))
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.groupBy(
				forums.id,
				forums.userId,
				forums.title,
				forums.description,
				forums.type,
				forums.topic,
				forums.viewCount,
				forums.createdAt,
				forums.updatedAt,
				forumMedias.url,
				forumMedias.mediaType,
				users.firstName,
				users.lastName,
				forumLikes.forumId
			);
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
						likeCount: Number(forum.likeCount) || 0,
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

    return res.status(200).json(forumsWithMedia);
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
				likeCount: sql`COUNT(DISTINCT ${forumLikes.id})`,
				username: sql`${users.firstName} || ' ' || ${users.lastName}`, // Uncomment if you join users
				isLike: sql`CASE WHEN ${forumLikes.forumId} IS NOT NULL THEN true ELSE false END`, // Uncomment if you join userSavedForums
			})
			.from(forums)
			.leftJoin(forumMedias, eq(forums.id, forumMedias.forumId))
			.leftJoin(users, eq(forums.userId, users.id)) // Uncomment if you want user info
			.leftJoin(forumLikes, and(eq(forumLikes.forumId, forums.id), eq(forumLikes.userId, Number(userId))))
			.where(eq(forums.id, Number(id)))
			.groupBy(
				forums.id,
				forums.userId,
				forums.title,
				forums.description,
				forums.type,
				forums.topic,
				forums.viewCount,
				forums.createdAt,
				forums.updatedAt,
				forumMedias.url,
				forumMedias.mediaType,
				users.firstName,
				users.lastName,
				forumLikes.forumId
			);;

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
			likeCount: Number(forumRecords[0].likeCount) || 0,
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
	try {
		const { userId } = req.user ?? { userId: 1 };
		const { title, description, type, topic } = req.body;

		if (!userId || !title || !description) {
			return res.status(400).json({ success: false, message: "Missing required fields" });
		}

		// Insert forum
		const [newForum] = await db
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
		let newForumMedia: any[] = [];
		if (req.files) {
			for (const file of req.files as Express.Multer.File[]) {
				try {
					const uniqueKey = `${newForum.id}-${crypto.randomUUID()}-${file.originalname}`;
					const url = await uploadImageToCloudflare(uniqueKey, file.buffer, file.mimetype);
					const [media] = await db
						.insert(forumMedias)
						.values({
							forumId: newForum.id,
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

		return res.status(201).json({
			success: true,
			newForum,
			newForumMedia,
		});
	} catch (error) {
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
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params;
		const { title, description, type, topic, photosToRemove } = req.body;

		const doesUserOwnThisForum = await db
			.select()
			.from(forums)
			.where(and(eq(forums.id, Number(id)), eq(forums.userId, Number(userId))))
			.limit(1);
		if (doesUserOwnThisForum.length === 0) {
			return res.status(404).json({ success: false, message: "Forum not found" });
		}

		let photosToRemoveParse: { url: string }[] = [];
		if (photosToRemove) {
			try {
				photosToRemoveParse = JSON.parse(photosToRemove);
			} catch (err) {
				console.error("Error parsing photosToRemove:", err);
				return res.status(400).json({ success: false, message: "Invalid photosToRemove format" });
			}
		}
		let newForumMedia: any[] = [];
		if (req.files) {
			for (const file of req.files as Express.Multer.File[]) {
				try {
					const uniqueKey = `${id}-${crypto.randomUUID()}-${file.originalname}`;
					const url = await uploadImageToCloudflare(uniqueKey, file.buffer, file.mimetype);
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
						await deleteFromCloudflare("komplex-image", urlForDeletion[0].urlForDeletion);
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
		return res.status(200).json({ updateForum, newForumMedia, deleteMedia });
	} catch (error) {
		console.error("Error updating forum:", error);
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const deleteForum = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params;

		// Step 1: Verify forum ownership
		const doesUserOwnThisForum = await db
			.select()
			.from(forums)
			.where(and(eq(forums.id, Number(id)), eq(forums.userId, Number(userId))))
			.limit(1);

		if (doesUserOwnThisForum.length === 0) {
			return res.status(404).json({ success: false, message: "Forum not found" });
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
				mediaToDelete.map((media) => deleteFromCloudflare("komplex-image", media.urlToDelete ?? ""))
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

		return res.status(200).json({
			success: true,
			message: "Forum deleted successfully",
			deletedForum,
			deletedMedia,
			deleteReplies,
			deleteComments,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};
