import { Request, Response } from "express";
import { feedbacks } from "../../../db/models/feedbacks.js";
import { db } from "../../../db/index.js";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { users } from "../../../db/models/users.js";
import { feedbackMedia } from "../../../db/models/feedback_media.js";
import { redis } from "../../../db/redis/redisConfig.js";

export const getFeedbacks = async (req: Request, res: Response) => {
	try {
		const { page, status, type } = req.query;

		const pageNumber = Number(page) || 1;
		const limit = 20;
		const offset = (pageNumber - 1) * limit;

		// 1️⃣ Fetch filtered feedback IDs from DB
		const feedbackIds = await db
			.select({ id: feedbacks.id })
			.from(feedbacks)
			.orderBy(desc(feedbacks.updatedAt))
			.offset(offset)
			.limit(limit);

		const feedbackIdRows = feedbackIds.map((f) => ({ id: f.id }));

		if (!feedbackIdRows.length) return res.status(200).json({ feedbacksWithMedia: [], hasMore: false });

		const cachedResults = (await redis.mGet(feedbackIdRows.map((b) => `feedbacks:${b.id}`))) as (string | null)[];

		const hits: any[] = [];
		const missedIds: number[] = [];

		if (cachedResults.length > 0) {
			cachedResults.forEach((item, idx) => {
				if (item) hits.push(JSON.parse(item));
				else missedIds.push(feedbackIdRows[idx].id);
			});
		}

		let missedFeedbacks: any[] = [];
		if (missedIds.length > 0) {
			const feedbackRows = await db
				.select({
					id: feedbacks.id,
					userId: feedbacks.userId,
					content: feedbacks.content,
					type: feedbacks.type,
					createdAt: feedbacks.createdAt,
					updatedAt: feedbacks.updatedAt,
					username: sql`${users.firstName} || ' ' || ${users.lastName}`,
					mediaUrl: feedbackMedia.publicUrl,
				})
				.from(feedbacks)
				.leftJoin(feedbackMedia, eq(feedbacks.id, feedbackMedia.feedbackId))
				.leftJoin(users, eq(feedbacks.userId, users.id))
				.where(inArray(feedbacks.id, missedIds));

			missedFeedbacks = feedbackRows;

			// Write missed feedbacks to Redis
			for (const feedback of missedFeedbacks) {
				await redis.set(`feedbacks:${feedback.id}`, JSON.stringify(feedback), { EX: 600 });
			}
		}

		const allFeedbackMap = new Map<number, any>();
		hits.forEach((user) => allFeedbackMap.set(user.id, user));
		missedFeedbacks.forEach((user) => allFeedbackMap.set(user.id, user));
		const allFeedbacks = feedbackIds.map((r) => allFeedbackMap.get(r.id));

		return res.status(200).json({ feedbacksWithMedia: allFeedbacks, hasMore: allFeedbacks.length === limit });
	} catch (error) {
		res.status(500).json({ message: "Failed to get feedbacks" });
	}
};

export const updateFeedbackStatus = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		const { status } = req.body;
		const result = await db
			.update(feedbacks)
			.set({ status })
			.where(eq(feedbacks.id, Number(id)))
			.returning();
		const cacheKey = `feedbacks:${id}`;
		await redis.set(cacheKey, JSON.stringify({ ...result, status }), { EX: 600 });
		res.json(result);
	} catch (error) {
		res.status(500).json({ message: "Failed to update feedback status" });
	}
};
