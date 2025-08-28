import { eq, and, inArray, sql, desc, like } from "drizzle-orm";
import { forumComments, forumLikes, forumMedias, forumReplies, forums, users } from "../../../db/schema";
import { db } from "../../../db/index";
import { Request, Response } from "express";
import { forumCommentLikes } from "../../../db/models/forum_comment_like";
import { forumCommentMedias } from "../../../db/models/forum_comment_media";
import { forumReplyMedias } from "../../../db/models/forum_reply_media";
import { deleteReply } from "./forum_replies.controller";
import { deleteFromCloudflare, uploadImageToCloudflare } from "../../../db/cloudflare/cloudflareFunction";
import { redis } from "../../../db/redis/redisConfig";

interface AuthenticatedRequest extends Request {
	user?: {
		userId: string;
		// add other user properties if needed
	};
}

export const getAllCommentsForAForum = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const { userId } = req.user ?? { userId: 1 };
		const { page } = req.query;
		const pageNumber = Number(page) || 1;
		const limit = 40;
		const offset = (pageNumber - 1) * limit;

		const cacheKey = `forumComments:forum:${id}:page:${pageNumber}`;
		const cached = await redis.get(cacheKey);

		let cachedComments: any[] = [];
		if (cached) {
			cachedComments = JSON.parse(cached).commentsWithMedia;
			console.log("data from redis");
		}

		// --- Fetch dynamic fields fresh ---
		const dynamicData = await db
			.select({
				id: forumComments.id,
				likeCount: sql`COUNT(DISTINCT ${forumCommentLikes.forumCommentId})`,
				isLike: sql`CASE WHEN ${forumCommentLikes.forumCommentId} IS NOT NULL THEN true ELSE false END`,
			})
			.from(forumComments)
			.leftJoin(
				forumCommentLikes,
				and(
					eq(forumCommentLikes.forumCommentId, forumComments.id),
					eq(forumCommentLikes.userId, Number(userId))
				)
			)
			.where(eq(forumComments.forumId, Number(id)))
			.groupBy(forumComments.id, forumCommentLikes.forumCommentId)
			.offset(offset)
			.limit(limit);

		// If no cache → query full comments and cache static part
		if (!cachedComments.length) {
			const commentRows = await db
				.select({
					id: forumComments.id,
					userId: forumComments.userId,
					forumId: forumComments.forumId,
					description: forumComments.description,
					createdAt: forumComments.createdAt,
					updatedAt: forumComments.updatedAt,
					mediaUrl: forumCommentMedias.url,
					mediaType: forumCommentMedias.mediaType,
					username: sql`${users.firstName} || ' ' || ${users.lastName}`,
				})
				.from(forumComments)
				.leftJoin(forumCommentMedias, eq(forumComments.id, forumCommentMedias.forumCommentId))
				.leftJoin(users, eq(users.id, forumComments.userId))
				.leftJoin(forumCommentLikes, eq(forumComments.id, forumCommentLikes.forumCommentId))
				.where(eq(forumComments.forumId, Number(id)))
				.groupBy(
					forumComments.id,
					forumComments.userId,
					forumComments.forumId,
					forumComments.description,
					forumComments.createdAt,
					forumComments.updatedAt,
					forumCommentMedias.url,
					forumCommentMedias.mediaType,
					users.firstName,
					users.lastName
				)
				.orderBy(
					desc(sql`COUNT(DISTINCT ${forumCommentLikes.id})`),
					desc(sql`CASE WHEN DATE(${forumComments.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END`),
					desc(forumComments.updatedAt)
				)
				.offset(offset)
				.limit(limit);

			cachedComments = Object.values(
				commentRows.reduce((acc, comment) => {
					if (!acc[comment.id]) {
						acc[comment.id] = {
							id: comment.id,
							userId: comment.userId,
							forumId: comment.forumId,
							description: comment.description,
							createdAt: comment.createdAt,
							updatedAt: comment.updatedAt,
							media: [] as { url: string; type: string }[],
							username: comment.username,
						};
					}
					if (comment.mediaUrl) {
						acc[comment.id].media.push({
							url: comment.mediaUrl,
							type: comment.mediaType,
						});
					}
					return acc;
				}, {} as { [key: number]: any })
			);

			console.log("data from db");
			// Cache only static part
			await redis.set(cacheKey, JSON.stringify({ commentsWithMedia: cachedComments }), { EX: 60 });
		}

		// Merge dynamic data with cached static data
		const commentsWithMedia = cachedComments.map((c) => {
			const dynamic = dynamicData.find((d) => d.id === c.id);
			return {
				...c,
				likeCount: Number(dynamic?.likeCount) || 0,
				isLike: !!dynamic?.isLike,
			};
		});

		return res.status(200).json({ commentsWithMedia, hasMore: commentsWithMedia.length === limit });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const postForumComment = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: 1 };
		const { description } = req.body;
		const { id } = req.params;
		const limit = 40;

		if (!userId || !id || !description) {
			return res.status(400).json({ success: false, message: "Missing required fields" });
		}

		const [newForumComment] = await db
			.insert(forumComments)
			.values({
				userId: Number(userId),
				forumId: Number(id),
				description,
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();

		let newCommentMedia: any[] = [];
		if (req.files) {
			for (const file of req.files as Express.Multer.File[]) {
				try {
					const uniqueKey = `${newForumComment.id}-${crypto.randomUUID()}-${file.originalname}`;
					const url = await uploadImageToCloudflare(uniqueKey, file.buffer, file.mimetype);
					const [media] = await db
						.insert(forumCommentMedias)
						.values({
							forumCommentId: newForumComment.id,
							url: url,
							urlForDeletion: uniqueKey,
							mediaType: file.mimetype.startsWith("video") ? "video" : "image",
							createdAt: new Date(),
							updatedAt: new Date(),
						})
						.returning();
					newCommentMedia.push(media);
				} catch (error) {
					console.error("Error uploading file or saving media:", error);
				}
			}
		}
		const [username] = await db
			.select({ firstName: users.firstName, lastName: users.lastName })
			.from(users)
			.where(eq(users.id, Number(userId)));
		const forumCommentWithMedia = {
			id: newForumComment.id,
			userId: newForumComment.userId,
			description: newForumComment.description,
			createdAt: newForumComment.createdAt,
			updatedAt: newForumComment.updatedAt,
			username: username.firstName + " " + username.lastName,
			isSave: false,
			media: newCommentMedia.map((m) => ({
				url: m.url,
				type: m.mediaType,
			})),
		};

		let { currentCommentAmount, lastPage } = JSON.parse(
			(await redis.get(`forumComments:forum:${id}:lastPage`)) ||
				JSON.stringify({ currentCommentAmount: 0, lastPage: 1 })
		);

		// Determine which page to add the new comment
		if (currentCommentAmount >= limit) {
			// Last page is full → create a new page
			lastPage += 1;
			currentCommentAmount = 1;
		} else {
			// Add to existing last page
			currentCommentAmount += 1;
		}

		const cacheKey = `forumComments:forum:${id}:page:${lastPage}`;
		const cached = await redis.get(cacheKey);

		if (cached) {
			const parsed = JSON.parse(cached);
			parsed.commentsWithMedia.push(forumCommentWithMedia);
			await redis.set(cacheKey, JSON.stringify(parsed), { EX: 600 });
		} else {
			await redis.set(cacheKey, JSON.stringify({ commentsWithMedia: [forumCommentWithMedia] }), { EX: 600 });
		}

		// Update last page info in Redis
		await redis.set(`forumComments:forum:${id}:lastPage`, JSON.stringify({ currentCommentAmount, lastPage }), {
			EX: 600,
		});

		return res.status(201).json({
			success: true,
			comment: newForumComment,
			newCommentMedia,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const updateForumComment = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params;
		const { description, photosToRemove } = req.body;

		const doesUserOwnThisComment = await db
			.select()
			.from(forumComments)
			.where(and(eq(forumComments.id, Number(id)), eq(forumComments.userId, Number(userId))))
			.limit(1);

		if (doesUserOwnThisComment.length === 0) {
			return res.status(404).json({ success: false, message: "Comment not found" });
		}

		let photosToRemoveParse: { url: string }[] = [];
		if (photosToRemove) {
			try {
				photosToRemoveParse = JSON.parse(photosToRemove);
			} catch (err) {
				return res.status(400).json({ success: false, message: "Invalid photosToRemove format" });
			}
		}

		let newCommentMedia: any[] = [];
		if (req.files) {
			for (const file of req.files as Express.Multer.File[]) {
				try {
					const uniqueKey = `${id}-${crypto.randomUUID()}-${file.originalname}`;
					const url = await uploadImageToCloudflare(uniqueKey, file.buffer, file.mimetype);
					const [media] = await db
						.insert(forumCommentMedias)
						.values({
							forumCommentId: Number(id),
							url: url,
							urlForDeletion: uniqueKey,
							mediaType: file.mimetype.startsWith("video") ? "video" : "image",
							createdAt: new Date(),
							updatedAt: new Date(),
						})
						.returning();
					newCommentMedia.push(media);
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
							urlForDeletion: forumCommentMedias.urlForDeletion,
						})
						.from(forumCommentMedias)
						.where(eq(forumCommentMedias.url, photoToRemove.url));
					let deleted = null;
					if (urlForDeletion[0]?.urlForDeletion) {
						await deleteFromCloudflare("komplex-image", urlForDeletion[0].urlForDeletion);
						deleted = await db
							.delete(forumCommentMedias)
							.where(
								and(
									eq(forumCommentMedias.forumCommentId, Number(id)),
									eq(forumCommentMedias.urlForDeletion, urlForDeletion[0].urlForDeletion)
								)
							)
							.returning();
					}
					return deleted;
				})
			);

			deleteMedia = deleteResults.flat();
		}

		const [updateComment] = await db
			.update(forumComments)
			.set({
				description,
				updatedAt: new Date(),
			})
			.where(eq(forumComments.id, Number(id)))
			.returning();

		const pattern = `forumComments:forum:${updateComment.forumId}:page:*`;
		let cursor = "0";

		do {
			const scanResult = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
			cursor = scanResult.cursor;
			const keys = scanResult.keys;

			if (keys.length > 0) {
				// delete each key individually
				await Promise.all(keys.map((k) => redis.del(k)));
			}
		} while (cursor !== "0");

		// Optionally delete the lastPage tracker
		await redis.del(`forumComments:forum:${updateComment.forumId}:lastPage`);

		return res.status(200).json({ updateComment, newCommentMedia, deleteMedia });
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

		const doesUserOwnThisComment = await db
			.select()
			.from(forumComments)
			.where(and(eq(forumComments.id, Number(id)), eq(forumComments.userId, Number(userId))))
			.limit(1);

		if (doesUserOwnThisComment.length === 0) {
			return res.status(404).json({ success: false, message: "Comment not found" });
		}

		const doesThisCommentHasReply = await db
			.select()
			.from(forumReplies)
			.where(eq(forumReplies.forumCommentId, Number(id)));
		let replyResults = null;
		if (doesThisCommentHasReply.length > 0) {
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
		const mediasToDelete = await db
			.select({ urlForDeletion: forumCommentMedias.urlForDeletion })
			.from(forumCommentMedias)
			.where(eq(forumCommentMedias.forumCommentId, commentId));

		for (const media of mediasToDelete) {
			if (media.urlForDeletion) {
				await deleteFromCloudflare("komplex-image", media.urlForDeletion);
			}
		}

		const deletedMedia = await db
			.delete(forumCommentMedias)
			.where(eq(forumCommentMedias.forumCommentId, commentId))
			.returning({ url: forumCommentMedias.url, mediaType: forumCommentMedias.mediaType });

		const deletedLikes = await db
			.delete(forumCommentLikes)
			.where(eq(forumCommentLikes.forumCommentId, commentId))
			.returning();

		const deletedComment = await db
			.delete(forumComments)
			.where(and(eq(forumComments.id, commentId), eq(forumComments.userId, userId)))
			.returning();

		const pattern = `forumComments:forum:${deletedComment[0].forumId}:page:*`;
		let cursor = "0";

		do {
			const scanResult = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
			cursor = scanResult.cursor;
			const keys = scanResult.keys;

			if (keys.length > 0) {
				// delete each key individually
				await Promise.all(keys.map((k) => redis.del(k)));
			}
		} while (cursor !== "0");

		// Optionally delete the lastPage tracker
		await redis.del(`forumComments:forum:${deletedComment[0].forumId}:lastPage`);

		return { deletedComment, deletedMedia, deletedLikes };
	}

	// Delete all comments for a forumId
	if (forumId && commentId === null) {
		const getCommentIdsByForumId = await db
			.select({ id: forumComments.id })
			.from(forumComments)
			.where(eq(forumComments.forumId, forumId));
		const commentIds = getCommentIdsByForumId.map((c) => c.id);

		// First, select all medias to delete from the cloud
		const mediasToDelete = await db
			.select({ urlForDeletion: forumCommentMedias.urlForDeletion })
			.from(forumCommentMedias)
			.where(
				commentIds.length > 0
					? inArray(forumCommentMedias.forumCommentId, commentIds)
					: eq(forumCommentMedias.forumCommentId, -1)
			);

		for (const media of mediasToDelete) {
			if (media.urlForDeletion) {
				await deleteFromCloudflare("komplex-image", media.urlForDeletion);
			}
		}

		// Then, delete from the database
		const deletedMedia = await db
			.delete(forumCommentMedias)
			.where(
				commentIds.length > 0
					? inArray(forumCommentMedias.forumCommentId, commentIds)
					: eq(forumCommentMedias.forumCommentId, -1)
			)
			.returning();

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

		const pattern = `forumComments:forum:${deletedComment[0].forumId}:page:*`;
		let cursor = "0";

		do {
			const scanResult = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
			cursor = scanResult.cursor;
			const keys = scanResult.keys;

			if (keys.length > 0) {
				// delete each key individually
				await Promise.all(keys.map((k) => redis.del(k)));
			}
		} while (cursor !== "0");

		// Optionally delete the lastPage tracker
		await redis.del(`forumComments:forum:${deletedComment[0].forumId}:lastPage`);

		return { deletedComment, deletedMedia, deletedLikes };
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
