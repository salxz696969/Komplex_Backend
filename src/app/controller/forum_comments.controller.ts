import { eq, and, inArray } from "drizzle-orm";
import { forumComments, forumLikes, forumMedias, forumReplies, forums } from "../../db/schema";
import { db } from "../../db/index";
import { Request, Response } from "express";
import { deleteFromCloudinary, uploadToCloudinary } from "../../db/cloudinary/cloundinaryFunction";
import { forumCommentLikes } from "../../db/models/forum_comment_like";
import { forumCommentMedias } from "../../db/models/forum_comment_media";
import { forumReplyMedias } from "../../db/models/forum_reply_media";
import { deleteReply } from "./forum_replies.controller";

interface AuthenticatedRequest extends Request {
	user?: {
		userId: string;
		// add other user properties if needed
	};
}

export const getAllCommentsForAForum = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		const comments = await db
			.select()
			.from(forumComments)
			.where(eq(forumComments.forumId, Number(id)));
		if (comments.length > 0) {
			const commentMedia = await db
				.select()
				.from(forumMedias)
				.where(eq(forumMedias.forumId, Number(id)));
			const commentWithMedia = await Promise.all(
				comments.map(async (comment) => {
					const media = commentMedia.filter((m) => m.id === comment.id);
					return { ...comment, media };
				})
			);
			return res.status(200).json(commentWithMedia);
		}
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const postForumComment = async (req: AuthenticatedRequest, res: Response) => {
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

		// Insert forum comment
		const insertedForumComment = await db
			.insert(forumComments)
			.values({
				userId: Number(userId),
				forumId: Number(id),
				description,
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();

		// Insert comment media if uploaded
		let newCommentMedia = [];
		if (public_url.length > 0 && mediaType.length > 0) {
			for (let i = 0; i < public_url.length; i++) {
				const media = await db.insert(forumCommentMedias).values({
					forumCommentId: insertedForumComment[0].id,
					url: public_url[i],
					mediaType: mediaType[i],
					createdAt: new Date(),
					updatedAt: new Date(),
				});
				newCommentMedia.push(media);
			}
		}

		return res.status(201).json({
			success: true,
			forum: insertedForumComment[0],
			newCommentMedia,
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

export const likeForumComment = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: 1 };

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		const like = await db
			.insert(forumCommentLikes)
			.values({
				userId: Number(userId),
				forumCommentId: Number(id),
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

export const unlikeForumComment = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: 1 };

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		const unlike = await db
			.delete(forumCommentLikes)
			.where(and(eq(forumCommentLikes.userId, Number(userId)), eq(forumCommentLikes.forumCommentId, Number(id))))
			.returning();

		return res.status(200).json({ unlike });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const updateForumComment = async (req: AuthenticatedRequest, res: Response) => {
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

		// Check comment ownership
		const doesUserOwnThisComment = await db
			.select()
			.from(forumComments)
			.where(and(eq(forumComments.id, Number(id)), eq(forumComments.userId, Number(userId))))
			.limit(1);

		if (doesUserOwnThisComment.length === 0) {
			return res.status(404).json({ success: false, message: "Comment not found" });
		}

		// Remove media if requested
		if (handleRemoveMedia) {
			const deletedMedia = await db
				.delete(forumCommentMedias)
				.where(eq(forumCommentMedias.forumCommentId, Number(id)))
				.returning({ url: forumCommentMedias.url, mediaType: forumCommentMedias.mediaType });

			const mediaUrls = deletedMedia.map((m) => m.url);
			const mediaTypes = deletedMedia.map((m) => m.mediaType);
			for (let i = 0; i < mediaUrls.length; i++) {
				await deleteFromCloudinary(mediaUrls[i] ?? "", mediaTypes[i] ?? undefined);
			}
		}

		// Update comment
		const updateComment = await db
			.update(forumComments)
			.set({
				description,
				updatedAt: new Date(),
			})
			.where(eq(forumComments.id, Number(id)))
			.returning();

		// If new media uploaded, replace old media
		let updateCommentWithMedia = [];
		if (public_url.length > 0) {
			const deletedMedia = await db
				.delete(forumCommentMedias)
				.where(eq(forumCommentMedias.forumCommentId, Number(id)))
				.returning({ url: forumCommentMedias.url, mediaType: forumCommentMedias.mediaType });

			const mediaUrls = deletedMedia.map((m) => m.url);
			const mediaTypes = deletedMedia.map((m) => m.mediaType);
			for (let i = 0; i < mediaUrls.length; i++) {
				await deleteFromCloudinary(mediaUrls[i] ?? "", mediaTypes[i] ?? undefined);
			}

			const addToCommentMedia = await db
				.insert(forumCommentMedias)
				.values(
					public_url.map((url, index) => ({
						forumCommentId: Number(id),
						url,
						mediaType: mediaType[index],
						createdAt: new Date(),
						updatedAt: new Date(),
					}))
				)
				.returning();

			updateCommentWithMedia = await Promise.all(
				addToCommentMedia.map(async (media) => {
					const mediaDetails = await db
						.select()
						.from(forumCommentMedias)
						.where(eq(forumCommentMedias.id, media.id));
					return {
						...media,
						mediaType: mediaDetails[0].mediaType,
					};
				})
			);
			return res.status(200).json({
				updateCommentWithMedia,
			});
		}

		return res.status(200).json({ updateComment });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const deleteForumComment = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params; // id = commentId

		const commentRecord = await db
			.select()
			.from(forumComments)
			.where(and(eq(forumComments.id, Number(id)), eq(forumComments.userId, Number(userId))))
			.limit(1);

		if (commentRecord.length === 0) {
			return res.status(404).json({ success: false, message: "Comment not found" });
		}

		const replyToTheCommentRecord = await db
			.select()
			.from(forumReplies)
			.where(eq(forumReplies.forumCommentId, Number(id)));
		let replyResults = null;
		if (replyToTheCommentRecord.length > 0) {
			replyResults = await deleteReply(Number(userId), null, Number(id));
		}
		const commentResults = await deleteComment(Number(userId), Number(id), null);

		return res.status(200).json({
			success: true,
			message: "Comment deleted successfully",
			replyResults,
			commentResults,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const deleteComment = async (userId: number, commentId: number | null, forumId: number | null) => {
	if (commentId === null && forumId === null) {
		throw new Error("Either commentId or forumId must be provided");
	}

	// Delete by commentId
	if (commentId && forumId === null) {
		const deletedMedia = await db
			.delete(forumCommentMedias)
			.where(eq(forumCommentMedias.forumCommentId, commentId))
			.returning({ url: forumCommentMedias.url, mediaType: forumCommentMedias.mediaType });

		for (const media of deletedMedia) {
			await deleteFromCloudinary(media.url ?? "", media.mediaType ?? undefined);
		}

		const deletedLikes = await db
			.delete(forumCommentLikes)
			.where(eq(forumCommentLikes.forumCommentId, commentId))
			.returning();

		const deletedComment = await db
			.delete(forumComments)
			.where(and(eq(forumComments.id, commentId), eq(forumComments.userId, userId)))
			.returning();

		return { deletedComment, deletedMedia, deletedLikes };
	}

	// Delete all comments for a forumId
	if (forumId && commentId === null) {
		const getCommentIdsByForumId = await db
			.select({ id: forumComments.id })
			.from(forumComments)
			.where(eq(forumComments.forumId, forumId));
		const commentIds = getCommentIdsByForumId.map((c) => c.id);

		const deletedMedia = await db
			.delete(forumCommentMedias)
			.where(
				commentIds.length > 0
					? inArray(forumCommentMedias.forumCommentId, commentIds)
					: eq(forumCommentMedias.forumCommentId, -1)
			)
			.returning({ url: forumCommentMedias.url, mediaType: forumCommentMedias.mediaType });

		for (const media of deletedMedia) {
			await deleteFromCloudinary(media.url ?? "", media.mediaType ?? undefined);
		}

		const deletedLikes = await db
			.delete(forumCommentLikes)
			.where(
				commentIds.length > 0
					? inArray(forumCommentLikes.forumCommentId, commentIds)
					: eq(forumCommentLikes.forumCommentId, -1)
			)
			.returning();

		const deletedComment = await db
			.delete(forumComments)
			.where(commentIds.length > 0 ? inArray(forumComments.id, commentIds) : eq(forumComments.id, -1))
			.returning();

		return { deletedComment, deletedMedia, deletedLikes };
	}
};
