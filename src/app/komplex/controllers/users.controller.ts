import { Request, Response } from "express";
import { followers } from "./../../../db/models/followers.js";
import { db } from "./../../../db/index.js";
import { eq, and, inArray, sql } from "drizzle-orm";
interface AuthenticatedRequest extends Request {
	user?: {
		userId: string;
	};
}

export const followUser = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id: followedId } = req.params;

		if (!userId || !followedId) {
			return res.status(400).json({ success: false, message: "Missing userId or followedId" });
		}

		const follow = await db
			.insert(followers)
			.values({
				userId: Number(userId),
				followedId: Number(followedId),
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.returning();

		return res.status(200).json({ success: true, follow });
	} catch (error) {
		return res.status(500).json({ success: false, error: (error as Error).message });
	}
};

export const unfollowUser = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user ?? { userId: "1" };
		const { id } = req.params;

		if (!userId || !id) {
			return res.status(400).json({ success: false, message: "Missing userId or followedId" });
		}

		const unfollow = await db
			.delete(followers)
			.where(and(eq(followers.userId, Number(userId)), eq(followers.followedId, Number(id))))
			.returning();

		return res.status(200).json({ success: true, unfollow });
	} catch (error) {
		return res.status(500).json({ success: false, error: (error as Error).message });
	}
};
