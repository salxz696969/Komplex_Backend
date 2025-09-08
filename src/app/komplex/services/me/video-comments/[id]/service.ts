import { db } from "@/db/index.js";
import { videoReplies, videoCommentMedias, videoCommentLike, videoComments } from "@/db/schema.js";
import { and, eq, inArray } from "drizzle-orm";
import { deleteVideoReplyInternal } from "@/app/komplex/services/me/video-replies/[id]/service.js";
import { deleteFromCloudflare } from "@/db/cloudflare/cloudflareFunction.js";
import { redis } from "@/db/redis/redisConfig.js";
import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";

export const deleteVideoCommentInternal = async (userId: number, commentId: number | null, videoId: number | null) => {
	if (commentId === null && videoId === null) {
		throw new Error("Either commentId or videoId must be provided");
	}

	// Delete by commentId
	if (commentId && videoId === null) {
		const doesThisCommentHasReply = await db
			.select()
			.from(videoReplies)
			.where(eq(videoReplies.videoCommentId, Number(commentId)))
			.limit(1);

		let deleteReply = null;
		if (doesThisCommentHasReply.length > 0) {
			deleteReply = await deleteVideoReplyInternal(Number(userId), null, Number(commentId));
		}

		const mediaToDelete = await db
			.select({ urlForDeletion: videoCommentMedias.urlForDeletion })
			.from(videoCommentMedias)
			.where(eq(videoCommentMedias.videoCommentId, commentId));

		for (const media of mediaToDelete) {
			await deleteFromCloudflare("komplex-image", media.urlForDeletion ?? "");
		}

		const deletedMedia = await db
			.delete(videoCommentMedias)
			.where(eq(videoCommentMedias.videoCommentId, commentId))
			.returning({
				url: videoCommentMedias.url,
				mediaType: videoCommentMedias.mediaType,
			});

		const deletedLikes = await db
			.delete(videoCommentLike)
			.where(eq(videoCommentLike.videoCommentId, commentId))
			.returning();

		const deletedComment = await db
			.delete(videoComments)
			.where(and(eq(videoComments.id, commentId), eq(videoComments.userId, userId)))
			.returning();

		const pattern = `videoComments:video:${deletedComment[0].videoId}:page:*`;
		let cursor = "0";

		do {
			const scanResult = await redis.scan(cursor, {
				MATCH: pattern,
				COUNT: 100,
			});
			cursor = scanResult.cursor;
			const keys = scanResult.keys;

			if (keys.length > 0) {
				await Promise.all(keys.map((k) => redis.del(k)));
			}
		} while (cursor !== "0");

		await redis.del(`videoComments:video:${deletedComment[0].videoId}:lastPage`);

		return { deletedComment, deletedMedia, deletedLikes, deleteReply };
	}

	// Delete all comments for a videoId
	if (videoId && commentId === null) {
		const getCommentIdsByVideoId = await db
			.select({ id: videoComments.id })
			.from(videoComments)
			.where(eq(videoComments.videoId, videoId));
		const commentIds = getCommentIdsByVideoId.map((c) => c.id);

		const mediaToDelete = await db
			.select({ urlForDeletion: videoCommentMedias.urlForDeletion })
			.from(videoCommentMedias)
			.where(
				commentIds.length > 0
					? inArray(videoCommentMedias.videoCommentId, commentIds)
					: eq(videoCommentMedias.videoCommentId, -1)
			);

		for (const media of mediaToDelete) {
			await deleteFromCloudflare("komplex-image", media.urlForDeletion ?? "");
		}

		const deletedMedia = await db
			.delete(videoCommentMedias)
			.where(
				commentIds.length > 0
					? inArray(videoCommentMedias.videoCommentId, commentIds)
					: eq(videoCommentMedias.videoCommentId, -1)
			)
			.returning({
				url: videoCommentMedias.url,
				mediaType: videoCommentMedias.mediaType,
			});

		const deletedLikes = await db
			.delete(videoCommentLike)
			.where(
				commentIds.length > 0
					? inArray(videoCommentLike.videoCommentId, commentIds)
					: eq(videoCommentLike.videoCommentId, -1)
			)
			.returning();

		const deletedComment = await db
			.delete(videoComments)
			.where(commentIds.length > 0 ? inArray(videoComments.id, commentIds) : eq(videoComments.id, -1))
			.returning();

		const pattern = `videoComments:video:${deletedComment[0].videoId}:page:*`;
		let cursor = "0";

		do {
			const scanResult = await redis.scan(cursor, {
				MATCH: pattern,
				COUNT: 100,
			});
			cursor = scanResult.cursor;
			const keys = scanResult.keys;

			if (keys.length > 0) {
				await Promise.all(keys.map((k) => redis.del(k)));
			}
		} while (cursor !== "0");

		await redis.del(`videoComments:video:${deletedComment[0].videoId}:lastPage`);

		return { deletedComment, deletedMedia, deletedLikes };
	}
};

import { uploadVideoToCloudflare } from "@/db/cloudflare/cloudflareFunction.js";

export const updateVideoComment = async (
	id: string,
	userId: number,
	description: string,
	mediasToRemove: any,
	files: any
) => {
	const doesUserOwnThisComment = await db
		.select()
		.from(videoComments)
		.where(and(eq(videoComments.id, Number(id)), eq(videoComments.userId, Number(userId))))
		.limit(1);

	if (doesUserOwnThisComment.length === 0) {
		throw new Error("Comment not found");
	}

	let mediasToRemoveParse: { url: string }[] = [];
	if (mediasToRemove) {
		try {
			mediasToRemoveParse = typeof mediasToRemove === "string" ? JSON.parse(mediasToRemove) : mediasToRemove;
		} catch (err) {
			throw new Error("Invalid mediasToRemove format");
		}
	}

	let newCommentMedia: any[] = [];
	if (files) {
		for (const file of files as Express.Multer.File[]) {
			try {
				const uniqueKey = `${id}-${crypto.randomUUID()}-${file.originalname}`;
				const url = await uploadVideoToCloudflare(uniqueKey, file.buffer, file.mimetype);
				const [media] = await db
					.insert(videoCommentMedias)
					.values({
						videoCommentId: Number(id),
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
	if (mediasToRemoveParse && mediasToRemoveParse.length > 0) {
		const deleteResults = await Promise.all(
			mediasToRemoveParse.map(async (mediaToRemove: any) => {
				const urlForDeletion = await db
					.select({ urlForDeletion: videoCommentMedias.urlForDeletion })
					.from(videoCommentMedias)
					.where(eq(videoCommentMedias.url, mediaToRemove.url));
				let deleted = null;
				if (urlForDeletion[0]?.urlForDeletion) {
					await deleteFromCloudflare("komplex-image", urlForDeletion[0].urlForDeletion);
					deleted = await db
						.delete(videoCommentMedias)
						.where(
							and(
								eq(videoCommentMedias.videoCommentId, Number(id)),
								eq(videoCommentMedias.urlForDeletion, urlForDeletion[0].urlForDeletion)
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
		.update(videoComments)
		.set({
			description,
			updatedAt: new Date(),
		})
		.where(eq(videoComments.id, Number(id)))
		.returning();

	const pattern = `videoComments:video:${updateComment.videoId}:page:*`;
	let cursor = "0";

	do {
		const scanResult = await redis.scan(cursor, { MATCH: pattern, COUNT: 100 });
		cursor = scanResult.cursor;
		const keys = scanResult.keys;

		if (keys.length > 0) {
			await Promise.all(keys.map((k) => redis.del(k)));
		}
	} while (cursor !== "0");

	await redis.del(`videoComments:video:${updateComment.videoId}:lastPage`);

	return {
		data: { updateComment, newCommentMedia, deleteMedia },
	};
};

export const deleteVideoComment = async (id: string, userId: number) => {
	const doesUserOwnThisComment = await db
		.select()
		.from(videoComments)
		.where(and(eq(videoComments.id, Number(id)), eq(videoComments.userId, Number(userId))))
		.limit(1);

	if (doesUserOwnThisComment.length === 0) {
		throw new Error("Comment not found");
	}

	const commentResults = await deleteVideoCommentInternal(Number(userId), Number(id), null);

	return {
		data: {
			success: true,
			message: "Comment deleted successfully",
			commentResults,
		},
	};
};

export const likeVideoComment = async (id: string, userId: number) => {
	try {
		const like = await db
			.insert(videoCommentLike)
			.values({
				userId: Number(userId),
				videoCommentId: Number(id),
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();

		return {
			data: {
				success: true,
				message: "Comment liked successfully",
				like,
			},
		};
	} catch (error) {
		throw new Error((error as Error).message);
	}
};

export const unlikeVideoComment = async (id: string, userId: number) => {
	try {
		const unlike = await db
			.delete(videoCommentLike)
			.where(and(eq(videoCommentLike.userId, Number(userId)), eq(videoCommentLike.videoCommentId, Number(id))))
			.returning();

		return {
			data: {
				success: true,
				message: "Comment unliked successfully",
				unlike,
			},
		};
	} catch (error) {
		throw new Error((error as Error).message);
	}
};
