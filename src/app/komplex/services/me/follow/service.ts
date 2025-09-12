import { db } from "@/db/index.js";
import { redis } from "@/db/redis/redisConfig.js";
import { followers } from "@/db/schema.js";
import { eq } from "drizzle-orm";

export const getFollowersService = async (userId: number, page?: number, limit?: number, offset?: number) => {
	const cacheKey = `userFollowers:userId:${userId}:page:${page}`;
	const redisData = await redis.get(cacheKey);
	if (redisData) {
		return { data: JSON.parse(redisData), hasMore: JSON.parse(redisData).length === (limit || 20) };
	}
	const followersList = await db
		.select()
		.from(followers)
		.where(eq(followers.followedId, Number(userId)))
		.limit(limit || 20)
		.offset(offset || (page ? (page - 1) * (limit || 20) : 0));
	await redis.set(cacheKey, JSON.stringify(followersList), {
		EX: 60 * 60 * 24,
	});
	return { data: followersList, hasMore: followersList.length === (limit || 20) };
};



export const getFollowingService = async (userId: number, page?: number, limit?: number, offset?: number) => {
	const cacheKey = `userFollowing:userId:${userId}:page:${page}`;
	const redisData = await redis.get(cacheKey);
	if (redisData) {
		return { data: JSON.parse(redisData), hasMore: JSON.parse(redisData).length === (limit || 20) };
	}
	const followingList = await db
		.select()
		.from(followers)
		.where(eq(followers.userId, Number(userId)))
		.limit(limit || 20)
		.offset(offset || (page ? (page - 1) * (limit || 20) : 0));
	await redis.set(cacheKey, JSON.stringify(followingList), {
		EX: 60 * 60 * 24,
	});
	return { data: followingList, hasMore: followingList.length === (limit || 20) };
};