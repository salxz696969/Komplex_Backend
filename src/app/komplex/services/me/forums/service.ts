import { eq, sql, and } from "drizzle-orm";
import { db } from "@/db/index.js";
import { redis } from "@/db/redis/redisConfig.js";
import { forums, forumMedias, users, forumLikes } from "@/db/schema.js";
import { uploadImageToCloudflare } from "@/db/cloudflare/cloudflareFunction.js";
import { meilisearch } from "@/config/meilisearchConfig.js";
import { profile } from "console";

export const getAllMyForums = async (query: any, userId: number, page?: string) => {
	const { type, topic } = query;
	const conditions = [];
	conditions.push(eq(forums.userId, userId));
	if (type) conditions.push(eq(forums.type, type as string));
	if (topic) conditions.push(eq(forums.topic, topic as string));
	const pageNumber = Number(page) || 1;
	const limit = 20;
	const offset = (pageNumber - 1) * limit;
	const cacheKey = `userForums:${userId}:type:${type || "all"}:topic:${topic || "all"}:page:${pageNumber}`;
	const cached = await redis.get(cacheKey);
	const parseData = cached ? JSON.parse(cached) : null;
	if (parseData) {
		let dataToSend = [] as any[];
		await Promise.all(
			parseData.data.map(async (forum: any) => {
				const [freshForumData] = await db

					.select({
						likeCount: sql`COUNT(DISTINCT ${forumLikes.id})`,
						viewCount: forums.viewCount,
					})
					.from(forums)
					.where(eq(forums.id, forum.id))
					.leftJoin(forumLikes, eq(forumLikes.forumId, forums.id))
					.groupBy(forums.id);
				dataToSend.push({
					...forum,
					likeCount: Number(freshForumData.likeCount),
					viewCount: freshForumData.viewCount,
				});
			})
		);

		return { data: [...dataToSend], hasMore: parseData.length === limit };
	}

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
			username: sql`${users.firstName} || ' ' || ${users.lastName}`,
			profileImage: users.profileImage,
		})
		.from(forums)
		.leftJoin(forumMedias, eq(forums.id, forumMedias.forumId))
		.leftJoin(users, eq(forums.userId, users.id))
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
			forumLikes.forumId,
			users.profileImage
		)
		.offset(offset)
		.limit(limit);
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
					username: forum.username,
					profileImage: forum.profileImage,
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
	await redis.set(
		cacheKey,
		JSON.stringify({
			data: forumsWithMedia,
			hasMore: forumsWithMedia.length === limit,
		}),
		{
			EX: 60 * 60 * 24,
		}
	);

	return { data: forumsWithMedia, hasMore: forumsWithMedia.length === limit };
};

export const postForum = async (body: any, files: any, userId: number) => {
	const { title, description, type, topic } = body;

	if (!userId || !title || !description) {
		throw new Error("Missing required fields");
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
	if (files) {
		for (const file of files as Express.Multer.File[]) {
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

	const [username] = await db
		.select({ firstName: users.firstName, lastName: users.lastName })
		.from(users)
		.where(eq(users.id, Number(userId)));
	const forumWithMedia = {
		id: newForum.id,
		userId: newForum.userId,
		title: newForum.title,
		description: newForum.description,
		type: newForum.type,
		topic: newForum.topic,
		viewCount: newForum.viewCount,
		createdAt: newForum.createdAt,
		updatedAt: newForum.updatedAt,
		username: username.firstName + " " + username.lastName,
		isSave: false,
		media: newForumMedia.map((m) => ({
			url: m.url,
			type: m.mediaType,
		})),
	};
	const redisKey = `forums:${newForum.id}`;
	await meilisearch.index("forums").addDocuments([forumWithMedia]);

	await redis.set(redisKey, JSON.stringify(forumWithMedia), { EX: 600 });
	await redis.del(`dashboardData:${userId}`);
	// Delete all userForums cache keys for this user regardless of type or topic
	const myForumKeys: string[] = await redis.keys(`userForums:${userId}:type:*:topic:*:page:*`);
	if (myForumKeys.length > 0) {
		await redis.del(myForumKeys);
	}

	return { data: { success: true, newForum, newForumMedia } };
};
