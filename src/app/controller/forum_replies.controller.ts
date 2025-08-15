import { eq, and, inArray } from "drizzle-orm";
import { forumComments, forumLikes, forumMedias, forumReplies, forums } from "../../db/schema";
import { db } from "../../db/index";
import { Request, Response } from "express";
import { deleteFromCloudinary, uploadToCloudinary } from "../../db/cloudinary/cloundinaryFunction";
import { forumCommentLikes } from "../../db/models/forum_comment_like";
import { forumReplyLikes } from "../../db/models/forum_reply_like";
import { forumReplyMedias } from "../../db/models/forum_reply_media";
import { get } from "http";

interface AuthenticatedRequest extends Request {
	user?: {
		userId: string;
		// add other user properties if needed
	};
}

export const getAllRepliesForAComment = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		const replies = await db
			.select()
			.from(forumReplies)
			.where(eq(forumReplies.forumCommentId, Number(id)));
		if (replies.length > 0) {
			const replyMedia = await db
				.select()
				.from(forumReplyMedias)
				.where(eq(forumReplyMedias.forumReplyId, Number(id)));
			const replyWithMedia = await Promise.all(
				replies.map(async (reply) => {
					const media = replyMedia.filter((m) => m.forumReplyId === reply.id);
					return { ...reply, media };
				})
			);
			return res.json(replyWithMedia).status(200);
		}
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const postForumReply = async (req: AuthenticatedRequest, res: Response) => {
	let public_url: string[] = [];
	let mediaType: ("image" | "video")[] = [];

	try {
		// Handle optional file upload (multiple files)
		if (Array.isArray(req.files) && req.files.length > 0) {
			for (const file of req.files) {
				const result = await uploadToCloudinary(file.buffer, "my_app_uploads", "auto");
				public_url.push((result as { secure_url: string }).secure_url);
				mediaType.push(file.mimetype.startsWith("video") ? "video" : "image");
			}
		}

		const { userId } = req.user ?? { userId: 1 };
		const { description } = req.body;
		const { id } = req.params;

		if (!userId || !id || !description) {
			return res.status(400).json({ success: false, message: "Missing required fields" });
		}

		// Insert forum reply
		const insertedForumReply = await db
			.insert(forumReplies)
			.values({
				userId: Number(userId),
				forumCommentId: Number(id),
				description,
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();

		// Insert reply media if uploaded
		let newReplyMedia = [];
		if (public_url.length > 0 && mediaType.length > 0) {
			for (let i = 0; i < public_url.length; i++) {
				const media = await db.insert(forumReplyMedias).values({
					forumReplyId: insertedForumReply[0].id,
					url: public_url[i],
					mediaType: mediaType[i],
					createdAt: new Date(),
					updatedAt: new Date(),
				});
				newReplyMedia.push(media);
			}
		}

		return res.status(201).json({
			success: true,
			forum: insertedForumReply[0],
			newReplyMedia,
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
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const likeForumCommentReply = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: 1 };

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		const like = await db.insert(forumReplyLikes).values({
			userId: Number(userId),
			forumReplyId: Number(id),
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		return res.status(200).json({ like });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const unlikeForumCommentReply = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: 1 };

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		const unlike = await db
			.delete(forumReplyLikes)
			.where(and(eq(forumReplyLikes.userId, Number(userId)), eq(forumReplyLikes.forumReplyId, Number(id))))
			.returning();

		return res.json({ unlike }).status(200);
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const updateForumReply = async (req: AuthenticatedRequest, res: Response) => {
	let public_url: string[] = [];
	let mediaType: ("image" | "video")[] = [];
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params;
		const { description, isRemoveMedia } = req.body;

		// Handle file uploads (multiple files)
		if (Array.isArray(req.files) && req.files.length > 0) {
			for (const file of req.files) {
				const result = await uploadToCloudinary(file.buffer, "my_app_uploads", "auto");
				public_url.push((result as { secure_url: string }).secure_url);
				mediaType.push(file.mimetype.startsWith("video") ? "video" : "image");
			}
		}

		let handleRemoveMedia = isRemoveMedia;
		if (public_url.length === 0 && mediaType.length === 0 && isRemoveMedia) handleRemoveMedia = false;

		// Check reply ownership
		const doesUserOwnThisReply = await db
			.select()
			.from(forumReplies)
			.where(and(eq(forumReplies.id, Number(id)), eq(forumReplies.userId, Number(userId))))
			.limit(1);

		if (doesUserOwnThisReply.length === 0) {
			return res.status(404).json({ success: false, message: "Reply not found" });
		}

		// Remove media if requested
		if (handleRemoveMedia) {
			const deletedMedia = await db
				.delete(forumReplyMedias)
				.where(eq(forumReplyMedias.forumReplyId, Number(id)))
				.returning({ url: forumReplyMedias.url, mediaType: forumReplyMedias.mediaType });

			const mediaUrls = deletedMedia.map((m) => m.url);
			const mediaTypes = deletedMedia.map((m) => m.mediaType);
			for (let i = 0; i < mediaUrls.length; i++) {
				await deleteFromCloudinary(mediaUrls[i] ?? "", mediaTypes[i] ?? undefined);
			}
		}

		// Update reply
		const updateReply = await db
			.update(forumReplies)
			.set({
				description,
				updatedAt: new Date(),
			})
			.where(eq(forumReplies.id, Number(id)))
			.returning();

		// If new media uploaded, replace old media
		let updateReplyWithMedia = [];
		if (public_url.length > 0) {
			const deletedMedia = await db
				.delete(forumReplyMedias)
				.where(eq(forumReplyMedias.forumReplyId, Number(id)))
				.returning({ url: forumReplyMedias.url, mediaType: forumReplyMedias.mediaType });

			const mediaUrls = deletedMedia.map((m) => m.url);
			const mediaTypes = deletedMedia.map((m) => m.mediaType);
			for (let i = 0; i < mediaUrls.length; i++) {
				await deleteFromCloudinary(mediaUrls[i] ?? "", mediaTypes[i] ?? undefined);
			}

			const addToReplyMedia = await db
				.insert(forumReplyMedias)
				.values(
					public_url.map((url, index) => ({
						forumReplyId: Number(id),
						url,
						mediaType: mediaType[index],
						createdAt: new Date(),
						updatedAt: new Date(),
					}))
				)
				.returning();

			updateReplyWithMedia = await Promise.all(
				addToReplyMedia.map(async (media) => {
					const mediaDetails = await db
						.select()
						.from(forumReplyMedias)
						.where(eq(forumReplyMedias.id, media.id));
					return {
						...media,
						mediaType: mediaDetails[0].mediaType,
					};
				})
			);
			return res.status(200).json({
				updateReplyWithMedia,
			});
		}

		return res.status(200).json({ updateReply });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const deleteForumReply = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params;

		const replyRecord = await db
			.select()
			.from(forumReplies)
			.where(and(eq(forumReplies.id, Number(id)), eq(forumReplies.userId, Number(userId))))
			.limit(1);

		if (replyRecord.length === 0) {
			return res.status(404).json({ success: false, message: "Reply not found" });
		}
		const result = await deleteReply(Number(userId), Number(id), null);

		return res.status(200).json({
			success: true,
			message: "Reply deleted successfully",
			...result,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const deleteReply = async (userId: number, replyId: number | null, commentId: number | null) => {
	if (replyId === null && commentId === null) {
		throw new Error("Either replyId or commentId must be provided");
	}

	if (replyId && commentId === null) {
		const deletedMedia = await db
			.delete(forumReplyMedias)
			.where(eq(forumReplyMedias.forumReplyId, replyId))
			.returning({ url: forumReplyMedias.url, mediaType: forumReplyMedias.mediaType });
		for (const media of deletedMedia) {
			await deleteFromCloudinary(media.url ?? "", media.mediaType ?? undefined);
		}
		const deleteLikeReply = await db
			.delete(forumReplyLikes)
			.where(eq(forumReplyLikes.forumReplyId, replyId))
			.returning();
		const deletedReply = await db
			.delete(forumReplies)
			.where(and(eq(forumReplies.id, replyId), eq(forumReplies.userId, userId)))
			.returning();
		return { deletedReply, deletedMedia, deleteLikeReply };
	}

	if (commentId && replyId === null) {
		const getReplyIdByCommentId = await db
			.select({ id: forumReplies.id })
			.from(forumReplies)
			.where(eq(forumReplies.forumCommentId, commentId));
		const replyIds = getReplyIdByCommentId.map((r) => r.id);
		const deletedMedia = await db
			.delete(forumReplyMedias)
			.where(
				replyIds.length > 0
					? inArray(forumReplyMedias.forumReplyId, replyIds)
					: eq(forumReplyMedias.forumReplyId, -1)
			)
			.returning({ url: forumReplyMedias.url, mediaType: forumReplyMedias.mediaType });
		for (const media of deletedMedia) {
			await deleteFromCloudinary(media.url ?? "", media.mediaType ?? undefined);
		}
		const deleteLikeReply = await db
			.delete(forumReplyLikes)
			.where(
				replyIds.length > 0
					? inArray(forumReplyLikes.forumReplyId, replyIds)
					: eq(forumReplyLikes.forumReplyId, -1)
			)
			.returning();
		const deletedReply = await db
			.delete(forumReplies)
			.where(replyIds.length > 0 ? inArray(forumReplies.id, replyIds) : eq(forumReplies.id, -1))
			.returning();
		return { deletedReply, deletedMedia, deleteLikeReply };
	}
};
