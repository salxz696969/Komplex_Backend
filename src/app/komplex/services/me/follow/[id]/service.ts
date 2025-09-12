import { db } from "@/db/index.js";
import { redis } from "@/db/redis/redisConfig.js";
import { followers } from "@/db/schema.js";
import { eq, and } from "drizzle-orm";

export const unfollowUserService = async (userId: number, followedId: number) => {
	await db
		.delete(followers)
		.where(and(eq(followers.userId, Number(userId)), eq(followers.followedId, Number(followedId))))
		.returning();
	const myFollowingKeys: string[] = await redis.keys(`userFollowing:${userId}:page:*`);
	if (myFollowingKeys.length > 0) {
		await redis.del(myFollowingKeys);
	}
	return { message: "Successfully unfollowed the user." };
};
