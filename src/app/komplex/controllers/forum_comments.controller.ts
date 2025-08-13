import { eq, and, inArray } from "drizzle-orm";
import { forumComments, forumLikes, forumMedias, forumReplies, forums } from "../../../db/schema";
import { db } from "../../../db/index";
import { Request, Response } from "express";
import { deleteFromCloudinary, uploadToCloudinary } from "../../../db/cloudinary/cloundinaryFunction";
import { forumCommentLikes } from "../../../db/models/forum_comment_like";
import { forumCommentMedias } from "../../../db/models/forum_comment_media";
import { forumReplyMedias } from "../../../db/models/forum_reply_media";

interface AuthenticatedRequest extends Request {
	user?: {
		userId: string;
		// add other user properties if needed
	};
}

export const getAllCommentForAForum = async (req: Request, res: Response) => {
	try {
		const { forumId } = req.params;

		const comments = await db
			.select()
			.from(forumComments)
			.where(eq(forumComments.forumId, Number(forumId)));

		return res.json(comments).status(200);
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const postForumComment = async (req: AuthenticatedRequest, res: Response) => {
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
		const { userId } = req.user ?? {};
		const { description } = req.body;
		const { forumId } = req.params;

		// Create the forum entry
		const insertedForumComment = await db
			.insert(forumComments)
			.values({
				userId: Number(userId),
				forumId: Number(forumId),
				description,
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();
		if (public_url) {
			await db.insert(forumCommentMedias).values({
				forumCommentId: insertedForumComment[0].id,
				url: public_url,
				mediaType,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		}

		return res.status(201).json({
			forum: insertedForumComment[0],
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const likeForumComment = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.body;
		const { userId } = req.user ?? {};

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		await db.insert(forumCommentLikes).values({
			userId: Number(userId),
			forumCommentId: Number(id),
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		return res.status(200).json({ success: true, message: "Forum liked successfully" });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const unlikeForumComment = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.body;
		const { userId } = req.user ?? {};

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		await db
			.delete(forumCommentLikes)
			.where(and(eq(forumCommentLikes.userId, Number(userId)), eq(forumCommentLikes.forumCommentId, Number(id))))
			.returning();

		return res.json({ success: true, message: "Forum unliked successfully" }).status(200);
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const updateForumComment = async (req: AuthenticatedRequest, res: Response) => {
	const { userId } = req.user ?? {};
	const getCorrectUser = await db
		.select()
		.from(forumComments)
		.where(eq(forumComments.userId, Number(userId)));
	if (!getCorrectUser || getCorrectUser.length === 0) {
		return res.status(404).json({ success: false, message: "Forum not found" });
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
		try {
			const { description } = req.body;
			const { id } = req.params;

			// Create the forum entry
			const insertedForumComment = await db
				.update(forumComments)
				.set({
					userId: Number(userId),
					description,
					updatedAt: new Date(),
				})
				.where(eq(forums.id, Number(id)))
				.returning();
			const newForum = insertedForumComment[0];

			let newMedia = null;

			// Only create media entry if file exists
			if (public_url && mediaType) {
				const oldMediaUrl = await db
					.select()
					.from(forumCommentMedias)
					.where(eq(forumCommentMedias.forumCommentId, newForum.id));
				if (oldMediaUrl && oldMediaUrl.length > 0) {
					await deleteFromCloudinary(oldMediaUrl[0].url ?? "", oldMediaUrl[0].mediaType ?? undefined);
				}
				newMedia = await db
					.update(forumCommentMedias)
					.set({
						url: public_url,
						mediaType,
					})
					.where(eq(forumCommentMedias.forumCommentId, newForum.id))
					.returning();
			}

			return res.status(200).json({
				forum: newForum,
				media: newMedia,
			});
		} catch (error) {
			if (public_url) {
				await deleteFromCloudinary(public_url, mediaType ?? undefined);
			}
			return res.status(500).json({
				success: false,
				error: (error as Error).message,
			});
		}
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const deleteForumComment = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? {};
		const { id } = req.params; // id = commentId

		// 1. Check if comment exists and belongs to a forum owned by the user
		const comment = await db
			.select()
			.from(forumComments)
			.where(eq(forumComments.id, Number(id)));

		if (comment.length === 0) {
			return res.status(404).json({ success: false, message: "Comment not found" });
		}

		// Optional: verify forum belongs to user
		const forumOwner = await db
			.select()
			.from(forums)
			.where(and(eq(forums.id, Number(comment[0].forumId ?? 0)), eq(forums.userId, Number(userId))));

		if (forumOwner.length === 0) {
			return res.status(403).json({ success: false, message: "Not authorized" });
		}

		// 2. Get replies for this comment
		const replies = await db
			.select()
			.from(forumReplies)
			.where(eq(forumReplies.forumCommentId, Number(id)));
		const replyIds = replies.map((r) => r.id);

		// 3. Get media for comment
		const commentMedia = await db
			.select()
			.from(forumCommentMedias)
			.where(eq(forumCommentMedias.forumCommentId, Number(id)));

		// 4. Get media for replies
		const replyMedia =
			replyIds.length > 0
				? await db.select().from(forumReplyMedias).where(inArray(forumReplyMedias.forumReplyId, replyIds))
				: [];

		// 5. Delete media from Cloudinary
		for (const m of [...commentMedia, ...replyMedia]) {
			if (m.url) {
				await deleteFromCloudinary(m.url, m.mediaType ?? undefined);
			}
		}

		// 6. Delete from DB
		if (replyIds.length > 0) {
			await db.delete(forumReplyMedias).where(inArray(forumReplyMedias.forumReplyId, replyIds));
			await db.delete(forumReplies).where(inArray(forumReplies.id, replyIds));
		}

		await db.delete(forumCommentMedias).where(eq(forumCommentMedias.forumCommentId, Number(id)));
		await db.delete(forumComments).where(eq(forumComments.id, Number(id)));

		return res.status(200).json({ success: true, message: "Comment and replies deleted successfully" });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};
