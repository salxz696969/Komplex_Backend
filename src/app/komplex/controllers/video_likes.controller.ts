import { Response } from "express";

import { AuthenticatedRequest } from "../../../types/request.js";
import { db } from "../../../db/index.js";
import { users, videoLikes } from "../../../db/schema.js";
import { eq } from "drizzle-orm";

export const getVideoLikes = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

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

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: (err as Error).message,
    });
  }
};
