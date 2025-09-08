import { db } from "@/db/index.js";
import { users, videoLikes } from "@/db/schema.js";
import { eq } from "drizzle-orm";

export const getVideoLikes = async (id: string) => {
	const likesOfVideo = await db
		.select()
		.from(videoLikes)
		.leftJoin(users, eq(videoLikes.userId, users.id))
		.where(eq(videoLikes.videoId, Number(id)));

	const data = likesOfVideo.map((like) => ({
		id: like.video_likes.id,
		userId: like.video_likes.userId,
		videoId: like.video_likes.videoId,
		username: like.users?.firstName + " " + like.users?.lastName,
		createdAt: like.video_likes.createdAt,
		updatedAt: like.video_likes.updatedAt,
	}));

	return {
		data,
	};
};
