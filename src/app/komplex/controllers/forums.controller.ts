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

    return res.status(200).json(forumWithMedia);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};