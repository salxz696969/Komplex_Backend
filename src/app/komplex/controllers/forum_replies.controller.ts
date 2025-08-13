import { eq, and } from "drizzle-orm";
import { forumComments, forumLikes, forumMedias, forumReplies, forums } from "../../../db/schema";
import { db } from "../../../db/index";
import { Request, Response } from "express";
import { deleteFromCloudinary, uploadToCloudinary } from "../../../db/cloudinary/cloundinaryFunction";
import { forumCommentLikes } from "../../../db/models/forum_comment_like";
import { forumReplyLikes } from "../../../db/models/forum_reply_like";
import { forumReplyMedias } from "../../../db/models/forum_reply_media";

interface AuthenticatedRequest extends Request {
	user?: {
		userId: string;
		// add other user properties if needed
	};
}

export const getAllRepliesForAComment = async (req: Request, res: Response) => {
	try {
		const { forumCommentId } = req.params;

		const replies = await db
			.select()
			.from(forumReplies)
			.where(eq(forumReplies.forumCommentId, Number(forumCommentId)));

		return res.json(replies).status(200);
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const postForumReply = async (req: AuthenticatedRequest, res: Response) => {
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
		const { description, forumCommentId } = req.body;

		// Create the forum entry
		const insertedForumReply = await db
			.insert(forumReplies)
			.values({
				userId: Number(userId),
				forumCommentId: Number(forumCommentId),
				description,
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();

		if (public_url) {
			await db.insert(forumReplyMedias).values({
				forumReplyId: insertedForumReply[0].id,
				url: public_url,
				mediaType,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		}

		return res.status(201).json({
			forum: insertedForumReply[0],
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const likeForumCommentReply = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.body;
		const { userId } = req.user ?? {};

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		await db.insert(forumReplyLikes).values({
			userId: Number(userId),
			forumReplyId: Number(id),
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

export const unlikeForumCommentReply = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.body;
		const { userId } = req.user ?? {};

		if (!userId) {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}

		await db
			.delete(forumReplyLikes)
			.where(and(eq(forumReplyLikes.userId, Number(userId)), eq(forumReplyLikes.forumReplyId, Number(id))))
			.returning();

		return res.json({ success: true, message: "Forum unliked successfully" }).status(200);
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const updateForumReply = async (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.user ?? {};

    // Make sure the reply belongs to the user
    const getCorrectUser = await db
        .select()
        .from(forumReplies)
        .where(eq(forumReplies.userId, Number(userId)));

    if (!getCorrectUser || getCorrectUser.length === 0) {
        return res.status(404).json({ success: false, message: "Reply not found" });
    }

    let public_url: string | null = null;
    let mediaType: "image" | "video" | null = null;

    try {
        // If a file is uploaded, send to Cloudinary
        if (req.file) {
            const result = (await uploadToCloudinary(req.file.buffer, "my_app_uploads", "auto")) as {
                public_url: string;
            };
            public_url = result.public_url;
            mediaType = req.file.mimetype.startsWith("video") ? "video" : "image";
        }

        const { description } = req.body;
        const { id } = req.params; // replyId

        // Update the reply
        const updatedReply = await db
            .update(forumReplies)
            .set({
                description,
                updatedAt: new Date(),
            })
            .where(eq(forumReplies.id, Number(id)))
            .returning();

        const newReply = updatedReply[0];
        let newMedia = null;

        // If new media was uploaded, replace old one
        if (public_url && mediaType) {
            const oldMedia = await db
                .select()
                .from(forumReplyMedias)
                .where(eq(forumReplyMedias.forumReplyId, newReply.id));

            if (oldMedia.length > 0) {
                await deleteFromCloudinary(oldMedia[0].url ?? "", oldMedia[0].mediaType ?? undefined);
            }

            newMedia = await db
                .update(forumReplyMedias)
                .set({
                    url: public_url,
                    mediaType,
                })
                .where(eq(forumReplyMedias.forumReplyId, newReply.id))
                .returning();
        }

        return res.status(200).json({
            reply: newReply,
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
};

export const deleteForumReply = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { userId } = req.user ?? {};
        const { id } = req.params; // replyId

        // 1. Check if reply exists
        const reply = await db
            .select()
            .from(forumReplies)
            .where(eq(forumReplies.id, Number(id)));

        if (reply.length === 0) {
            return res.status(404).json({ success: false, message: "Reply not found" });
        }

        // 2. Optional: verify forum belongs to user
        const forumOwner = await db
            .select()
            .from(forumReplies)
            .where(
                and(
                    eq(forumReplies.userId, Number(userId))
                )
            );

        if (forumOwner.length === 0) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        // 3. Get reply media
        const replyMedia = await db
            .select()
            .from(forumReplyMedias)
            .where(eq(forumReplyMedias.forumReplyId, Number(id)));

        // 4. Delete media from Cloudinary
        for (const m of replyMedia) {
            if (m.url) {
                await deleteFromCloudinary(m.url, m.mediaType ?? undefined);
            }
        }

        // 5. Delete from DB
        await db.delete(forumReplyMedias).where(eq(forumReplyMedias.forumReplyId, Number(id)));
        await db.delete(forumReplies).where(eq(forumReplies.id, Number(id)));

        return res.status(200).json({ success: true, message: "Reply deleted successfully" });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
};
