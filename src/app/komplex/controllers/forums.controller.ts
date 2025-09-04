import { eq, and, inArray, sql, like, desc } from "drizzle-orm";
import { forumComments, forumLikes, forumMedias, forumReplies, forums, users } from "../../../db/schema.js";
import { db } from "../../../db/index.js";
import { Request, Response } from "express";
import { deleteFromCloudflare, uploadImageToCloudflare } from "../../../db/cloudflare/cloudflareFunction.js";
import { deleteReply } from "./forum_replies.controller.js";
import { deleteComment } from "./forum_comments.controller.js";
import { redis } from "../../../db/redis/redisConfig.js";

import { AuthenticatedRequest } from "../../../types/request.js";

export const getAllForums = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { type, topic, page } = req.query;
		const { userId } = req.user ?? { userId: 1 };
		const conditions = [];
		if (type) conditions.push(eq(forums.type, type as string));
		if (topic) conditions.push(eq(forums.topic, topic as string));

		const pageNumber = Number(page) || 1;
		const limit = 20;
		const offset = (pageNumber - 1) * limit;

		// 1️⃣ Fetch filtered forum IDs from DB
		const forumIdRows = await db
			.select({ id: forums.id })
			.from(forums)
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(
				desc(sql`CASE WHEN DATE(${forums.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END`),
				desc(forums.viewCount),
				desc(forums.updatedAt)
			)
			.offset(offset)
			.limit(limit);

		if (!forumIdRows.length)
			return res.status(200).json({ forumsWithMedia: [], hasMore: false });

		// 2️⃣ Fetch forums from Redis in one call
		const cachedResults = (await redis.mGet(
			forumIdRows.map(f => `forums:${f.id}`)
		)) as (string | null)[];

		const hits: any[] = [];
		const missedIds: number[] = [];

		if (cachedResults.length > 0) {
			cachedResults.forEach((item, idx) => {
				if (item) hits.push(JSON.parse(item));
				else missedIds.push(forumIdRows[idx].id);
			});
		}

		// 3️⃣ Fetch missing forums from DB
		let missedForums: any[] = [];
		if (missedIds.length > 0) {
			const forumRows = await db
				.select({
					id: forums.id,
					userId: forums.userId,
					title: forums.title,
					description: forums.description,
					type: forums.type,
					topic: forums.topic,
					createdAt: forums.createdAt,
					updatedAt: forums.updatedAt,
					mediaUrl: forumMedias.url,
					mediaType: forumMedias.mediaType,
					username: sql`${users.firstName} || ' ' || ${users.lastName}`,
				})
				.from(forums)
				.leftJoin(forumMedias, eq(forums.id, forumMedias.forumId))
				.leftJoin(users, eq(forums.userId, users.id))
				.where(inArray(forums.id, missedIds));

			const forumMap = new Map<number, any>();
			for (const forum of forumRows) {
				if (!forumMap.has(forum.id)) {
					const formatted = {
						id: forum.id,
						userId: forum.userId,
						title: forum.title,
						description: forum.description,
						type: forum.type,
						topic: forum.topic,
						createdAt: forum.createdAt,
						updatedAt: forum.updatedAt,
						username: forum.username,
						media: [] as { url: string; type: string }[],
					};
					forumMap.set(forum.id, formatted);
					missedForums.push(formatted);
				}

				if (forum.mediaUrl) {
					forumMap.get(forum.id).media.push({
						url: forum.mediaUrl,
						type: forum.mediaType,
					});
				}
			}

			// Write missed forums to Redis
			for (const forum of missedForums) {
				await redis.set(`forums:${forum.id}`, JSON.stringify(forum), { EX: 600 });
			}
		}

		// 4️⃣ Merge hits and missed forums, preserving original order
		const allForumsMap = new Map<number, any>();
		for (const forum of [...hits, ...missedForums]) allForumsMap.set(forum.id, forum);
		const allForums = forumIdRows.map(f => allForumsMap.get(f.id));

		// 5️⃣ Fetch dynamic fields fresh
		const dynamicData = await db
			.select({
				id: forums.id,
				viewCount: forums.viewCount,
				likeCount: sql`COUNT(DISTINCT ${forumLikes.id})`,
				isLike: sql`CASE WHEN ${forumLikes.forumId} IS NOT NULL THEN true ELSE false END`,
			})
			.from(forums)
			.leftJoin(
				forumLikes,
				and(eq(forumLikes.forumId, forums.id), eq(forumLikes.userId, Number(userId)))
			)
			.where(inArray(forums.id, forumIdRows.map(f => f.id)))
			.groupBy(forums.id, forumLikes.forumId);

		const forumsWithMedia = allForums.map(f => {
			const dynamic = dynamicData.find(d => d.id === f.id);
			return {
				...f,
				viewCount: (dynamic?.viewCount ?? 0) + 1,
				likeCount: Number(dynamic?.likeCount) || 0,
				isLike: !!dynamic?.isLike,
			};
		});

		return res.status(200).json({ forumsWithMedia, hasMore: allForums.length === limit });
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
		const cacheKey = `forums:${id}`;

		// Try Redis first (only static info)
		const cached = await redis.get(cacheKey);
		let forumData;
		if (cached) {
			forumData = JSON.parse(cached);
			console.log("data from redis");
		} else {
			// Fetch forum static info
			const forum = await db
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
					username: sql`${users.firstName} || ' ' || ${users.lastName}`,
				})
				.from(forums)
				.leftJoin(forumMedias, eq(forums.id, forumMedias.forumId))
				.leftJoin(users, eq(forums.userId, users.id))
				.where(eq(forums.id, Number(id)));

			if (!forum || forum.length === 0) {
				return res.status(404).json({ success: false, message: "Forum not found" });
			}

			// Increment view count
			await db
				.update(forums)
				.set({ viewCount: (forum[0]?.viewCount ?? 0) + 1, updatedAt: new Date() })
				.where(eq(forums.id, Number(id)));

			// Build static cacheable object
			forumData = {
				id: forum[0].id,
				userId: forum[0].userId,
				title: forum[0].title,
				description: forum[0].description,
				type: forum[0].type,
				topic: forum[0].topic,
				createdAt: forum[0].createdAt,
				updatedAt: new Date(),
				username: forum[0].username,
				media: forum
					.filter((f) => f.mediaUrl)
					.map((f) => ({
						url: f.mediaUrl,
						type: f.mediaType,
					})),
			};
			console.log("data from db");

			// Cache static data only
			await redis.set(cacheKey, JSON.stringify({ forumWithMedia: forumData }), { EX: 600 });
		}

		// Always fetch dynamic fields fresh
		const dynamic = await db
			.select({
				viewCount: forums.viewCount,
				likeCount: sql`COUNT(DISTINCT ${forumLikes.id})`,
				isLike: sql`CASE WHEN ${forumLikes.forumId} IS NOT NULL THEN true ELSE false END`,
			})
			.from(forums)
			.leftJoin(forumLikes, and(eq(forumLikes.forumId, forums.id), eq(forumLikes.userId, Number(userId))))
			.where(eq(forums.id, Number(id)))
			.groupBy(forums.id, forumLikes.forumId);

		const forumWithMedia = {
			...forumData,
			viewCount: (dynamic[0]?.viewCount ?? 0) + 1,
			likeCount: Number(dynamic[0]?.likeCount) || 0,
			isLike: !!dynamic[0]?.isLike,
		};

    return res.status(200).json(forumWithMedia);
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
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
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
          const uniqueKey = `${newForum.id}-${crypto.randomUUID()}-${
            file.originalname
          }`;
          const url = await uploadImageToCloudflare(
            uniqueKey,
            file.buffer,
            file.mimetype
          );
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

		await redis.set(redisKey, JSON.stringify(forumWithMedia), { EX: 600 });

		return res.status(201).json({
			success: true,
			newForum,
			newForumMedia,
		});
	} catch (error) {
		return res.status(500).json({ success: false, error: (error as Error).message });
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
      return res
        .status(404)
        .json({ success: false, message: "Forum not found" });
    }

    let photosToRemoveParse: { url: string }[] = [];
    if (photosToRemove) {
      try {
        photosToRemoveParse = JSON.parse(photosToRemove);
      } catch (err) {
        console.error("Error parsing photosToRemove:", err);
        return res
          .status(400)
          .json({ success: false, message: "Invalid photosToRemove format" });
      }
    }
    let newForumMedia: any[] = [];
    if (req.files) {
      for (const file of req.files as Express.Multer.File[]) {
        try {
          const uniqueKey = `${id}-${crypto.randomUUID()}-${file.originalname}`;
          const url = await uploadImageToCloudflare(
            uniqueKey,
            file.buffer,
            file.mimetype
          );
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
            await deleteFromCloudflare(
              "komplex-image",
              urlForDeletion[0].urlForDeletion
            );
            deleted = await db
              .delete(forumMedias)
              .where(
                and(
                  eq(forumMedias.forumId, Number(id)),
                  eq(
                    forumMedias.urlForDeletion,
                    urlForDeletion[0].urlForDeletion
                  )
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

		const forum = await db
			.select({
				id: forums.id,
				userId: forums.userId,
				title: forums.title,
				description: forums.description,
				type: forums.type,
				topic: forums.topic,
				createdAt: forums.createdAt,
				updatedAt: forums.updatedAt,
				mediaUrl: forumMedias.url,
				mediaType: forumMedias.mediaType,
				username: sql`${users.firstName} || ' ' || ${users.lastName}`,
			})
			.from(forums)
			.leftJoin(forumMedias, eq(forums.id, forumMedias.forumId))
			.leftJoin(users, eq(forums.userId, users.id))
			.where(eq(forums.id, Number(id)));

		const forumWithMedia = {
			id: forum[0].id,
			userId: forum[0].userId,
			title: forum[0].title,
			description: forum[0].description,
			type: forum[0].type,
			topic: forum[0].topic,
			createdAt: forum[0].createdAt,
			updatedAt: forum[0].updatedAt,
			username: forum[0]?.username,
			media: forum
				.filter((b) => b.mediaUrl)
				.map((b) => ({
					url: b.mediaUrl,
					type: b.mediaType,
				})),
		};
		await redis.del(`forums:${id}`);
		await redis.set(`forums:${id}`, JSON.stringify(forumWithMedia), { EX: 600 });
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
      return res
        .status(404)
        .json({ success: false, message: "Forum not found" });
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
        mediaToDelete.map((media) =>
          deleteFromCloudflare("komplex-image", media.urlToDelete ?? "")
        )
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
        deleteReplies = await deleteReply(
          Number(userId),
          null,
          commentRecord.id
        );
      }
      deleteComments = await deleteComment(Number(userId), null, Number(id));
    }

    // Step 4: Delete forum itself
    const deletedForum = await db
      .delete(forums)
      .where(eq(forums.id, Number(id)))
      .returning();

		await redis.del(`forums:${id}`);

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
