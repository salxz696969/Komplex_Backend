import { eq, and, inArray } from "drizzle-orm";
import { forumComments, forumLikes, forumMedias, forumReplies, forums } from "../../db/schema";
import { db } from "../../db/index";
import { Request, Response } from "express";
import { deleteFromCloudinary, uploadToCloudinary } from "../../db/cloudinary/cloundinaryFunction";
import { forumCommentMedias } from "../../db/models/forum_comment_media";
import { forumReplyMedias } from "../../db/models/forum_reply_media";
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

		const conditions = [];
		if (type) conditions.push(eq(forums.type, type as string));
		if (topic) conditions.push(eq(forums.topic, topic as string));

		const forumsFromDb =
			conditions.length > 0
				? await db
						.select()
						.from(forums)
						.where(and(...conditions))
				: await db.select().from(forums);

		const forumsWithMedia = await Promise.all(
			forumsFromDb.map(async (forum) => {
				const media = await db.select().from(forumMedias).where(eq(forumMedias.forumId, forum.id));
				return {
					...forum,
					media: media.map((m) => ({ url: m.url, mediaType: m.mediaType })),
				};
			})
		);

		return res.status(200).json({ forumsWithMedia });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const getForumById = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		const forumFromDb = await db
			.select()
			.from(forums)
			.where(eq(forums.id, Number(id)))
			.limit(1);

		if (!forumFromDb || forumFromDb.length === 0 || !forumFromDb[0]) {
			return res.status(404).json({ success: false, message: "Forum not found" });
		}

		if (forumFromDb && forumFromDb.length > 0 && forumFromDb[0]) {
			await db
				.update(forums)
				.set({ viewCount: (forumFromDb[0]?.viewCount ?? 0) + 1, updatedAt: new Date() })
				.where(eq(forums.id, Number(id)))
				.returning();
		}

		const forumWithMedia = await Promise.all(
			forumFromDb.map(async (forum) => {
				const media = await db.select().from(forumMedias).where(eq(forumMedias.forumId, forum.id));
				return {
					...forum,
					media: media.map((m) => ({ url: m.url, mediaType: m.mediaType })),
				};
			})
		);

		return res.json(forumWithMedia).status(200);
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const postForum = async (req: AuthenticatedRequest, res: Response) => {
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
		if (public_url.length > 0 && mediaType.length > 0) {
			for (let i = 0; i < public_url.length; i++) {
				newForumMedia = await db.insert(forumMedias).values({
					forumId: newForum[0].id,
					url: public_url[i],
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
		});
	} catch (error) {
		// Clean up uploaded files if DB insert failed
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
	let public_url: string[] = [];
	let mediaType: ("image" | "video")[] = [];
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params;
		const { title, description, type, topic, isRemovePhoto } = req.body;

		// Handle file uploads
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

		// Check forum ownership
		const doesUserOwnThisForum = await db
			.select()
			.from(forums)
			.where(and(eq(forums.id, Number(id)), eq(forums.userId, Number(userId))))
			.limit(1);

		if (doesUserOwnThisForum.length === 0) {
			return res.status(404).json({ success: false, message: "Forum not found" });
		}

		// Remove media if requested
		if (handleIfUserSendIsRemovePhotoTrueAndUploadMedia) {
			const deletedMedia = await db
				.delete(forumMedias)
				.where(eq(forumMedias.forumId, Number(id)))
				.returning({ url: forumMedias.url, mediaType: forumMedias.mediaType });

			const mediaUrls = deletedMedia.map((m) => m.url);
			const mediaTypes = deletedMedia.map((m) => m.mediaType);
			for (let i = 0; i < mediaUrls.length; i++) {
				await deleteFromCloudinary(mediaUrls[i] ?? "", mediaTypes[i] ?? undefined);
			}
		}

		// Update forum
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

		// If new media uploaded, replace old media
		if (public_url.length > 0) {
			const deletedMedia = await db
				.delete(forumMedias)
				.where(eq(forumMedias.forumId, Number(id)))
				.returning({ url: forumMedias.url, mediaType: forumMedias.mediaType });

			const mediaUrls = deletedMedia.map((m) => m.url);
			const mediaTypes = deletedMedia.map((m) => m.mediaType);
			for (let i = 0; i < mediaUrls.length; i++) {
				await deleteFromCloudinary(mediaUrls[i] ?? "", mediaTypes[i] ?? undefined);
			}

			const addToForumMedia = await db
				.insert(forumMedias)
				.values(
					public_url.map((url, index) => ({
						forumId: Number(id),
						url,
						mediaType: mediaType[index],
						createdAt: new Date(),
						updatedAt: new Date(),
					}))
				)
				.returning();

			const updateForumWithMedia = await Promise.all(
				addToForumMedia.map(async (media) => {
					const mediaDetails = await db.select().from(forumMedias).where(eq(forumMedias.id, media.id));
					return {
						...media,
						mediaType: mediaDetails[0].mediaType,
					};
				})
			);
			return res.status(200).json({
				updateForumWithMedia,
			});
		}

		return res.status(200).json({ updateForum });
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
			.where(and(eq(forumComments.forumId, Number(id)), eq(forumComments.userId, Number(userId))))
        let deleteReplies=null;
        let deleteComments=null;
        if(commentRecords.length>0){
            for(const commentRecord of commentRecords){
                deleteReplies= await deleteReply(Number(userId), null, commentRecord.id);
            }
            deleteComments= await deleteComment(Number(userId), null, Number(id));
        }
        const delForum= await deleteForumFunction(Number(userId), Number(id));
        return res.json({
            success: true,
            deleteReplies,
            deleteComments,
            delForum
        })

		// if (commentRecord.length === 0) {
		// 	return res.status(404).json({ success: false, message: "Comment not found" });
		// }

        // const replyToTheCommentRecord = await db
        //     .select({ id: forumReplies.id })
        //     .from(forumReplies)
        //     .where(eq(forumReplies.forumCommentId, Number(id)));
        // const commentIds=replyToTheCommentRecord.map((r) => r.id);
		// let replyResults = null;
		// if (replyToTheCommentRecord.length > 0) {
        //     for(const commentId of commentIds) {
		// 		replyResults = await deleteReply(Number(userId), null, commentId);
		// 	}
		// }

		// const commentToForumRecord = await db
		// 	.select()
		// 	.from(forumComments)
		// 	.where(eq(forumComments.id, Number(id)));

		// let commentResults = null;
		// if (commentToForumRecord.length > 0) {
		// 	commentResults = await deleteComment(Number(userId), null, Number(id));
		// }

		// const forumResults = await deleteForumFunction(Number(userId), Number(id));
		// return res.status(200).json({
		// 	success: true,
		// 	message: "Forum deleted successfully",
		// 	replyResults,
		// 	commentResults,
		// 	forumResults,
		// });
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

	return { deletedForum, deletedMedia };
};
