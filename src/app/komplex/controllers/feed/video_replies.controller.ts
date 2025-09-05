import { eq, and, inArray, sql, desc } from "drizzle-orm";
import { Request, Response } from "express";
import { db } from "../../../../db/index.js";
import { users, videoReplies } from "../../../../db/schema.js";
import { videoReplyMedias } from "../../../../db/models/video_reply_medias.js";
import { videoReplyLike } from "../../../../db/models/video_reply_like.js";
import {
  deleteFromCloudflare,
  uploadVideoToCloudflare,
} from "../../../../db/cloudflare/cloudflareFunction.js";
import { redis } from "../../../../db/redis/redisConfig.js";

import { AuthenticatedRequest } from "../../../../types/request.js";

export const getAllVideoRepliesForAComment = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };
    const { page } = req.query;
    const pageNumber = Number(page) || 1;
    const limit = 20;
    const offset = (pageNumber - 1) * limit;

    const cacheKey = `videoReplies:comment:${id}:page:${pageNumber}`;
    const cached = await redis.get(cacheKey);

    let cachedReplies: any[] = [];
    if (cached) {
      cachedReplies = JSON.parse(cached).repliesWithMedia;
    }

    // Fetch dynamic fields fresh
    const dynamicData = await db
      .select({
        id: videoReplies.id,
        likeCount: sql`COUNT(DISTINCT ${videoReplyLike.videoReplyId})`,
        isLike: sql`CASE WHEN ${videoReplyLike.videoReplyId} IS NOT NULL THEN true ELSE false END`,
      })
      .from(videoReplies)
      .leftJoin(
        videoReplyLike,
        and(
          eq(videoReplyLike.videoReplyId, videoReplies.id),
          eq(videoReplyLike.userId, Number(userId))
        )
      )
      .where(eq(videoReplies.videoCommentId, Number(id)))
      .groupBy(videoReplies.id, videoReplyLike.videoReplyId)
      .offset(offset)
      .limit(limit);

    if (!cachedReplies.length) {
      const replyRows = await db
        .select({
          id: videoReplies.id,
          userId: videoReplies.userId,
          videoCommentId: videoReplies.videoCommentId,
          description: videoReplies.description,
          createdAt: videoReplies.createdAt,
          updatedAt: videoReplies.updatedAt,
          mediaUrl: videoReplyMedias.url,
          mediaType: videoReplyMedias.mediaType,
          username: sql`${users.firstName} || ' ' || ${users.lastName}`,
        })
        .from(videoReplies)
        .leftJoin(
          videoReplyMedias,
          eq(videoReplies.id, videoReplyMedias.videoReplyId)
        )
        .leftJoin(users, eq(videoReplies.userId, users.id))
        .leftJoin(
          videoReplyLike,
          eq(videoReplies.id, videoReplyLike.videoReplyId)
        )
        .where(eq(videoReplies.videoCommentId, Number(id)))
        .groupBy(
          videoReplies.id,
          videoReplies.userId,
          videoReplies.videoCommentId,
          videoReplies.description,
          videoReplies.createdAt,
          videoReplies.updatedAt,
          videoReplyMedias.url,
          videoReplyMedias.mediaType,
          users.firstName,
          users.lastName
        )
        .orderBy(
          desc(sql`COUNT(DISTINCT ${videoReplyLike.id})`),
          desc(
            sql`CASE WHEN DATE(${videoReplies.updatedAt}) = CURRENT_DATE THEN 1 ELSE 0 END`
          ),
          desc(videoReplies.updatedAt)
        )
        .offset(offset)
        .limit(limit);

      cachedReplies = Object.values(
        replyRows.reduce((acc, reply) => {
          if (!acc[reply.id]) {
            acc[reply.id] = {
              id: reply.id,
              userId: reply.userId,
              videoCommentId: reply.videoCommentId,
              description: reply.description,
              createdAt: reply.createdAt,
              updatedAt: reply.updatedAt,
              media: [] as { url: string; type: string }[],
              username: reply.username,
            };
          }
          if (reply.mediaUrl) {
            acc[reply.id].media.push({
              url: reply.mediaUrl,
              type: reply.mediaType,
            });
          }
          return acc;
        }, {} as { [key: number]: any })
      );

      await redis.set(
        cacheKey,
        JSON.stringify({ repliesWithMedia: cachedReplies }),
        { EX: 60 }
      );
    }

    const repliesWithMedia = cachedReplies.map((r) => {
      const dynamic = dynamicData.find((d) => d.id === r.id);
      return {
        ...r,
        likeCount: Number(dynamic?.likeCount) || 0,
        isLike: !!dynamic?.isLike,
      };
    });

    return res
      .status(200)
      .json({ repliesWithMedia, hasMore: repliesWithMedia.length === limit });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const postForumVideoReply = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: 1 };
    const { description } = req.body;
    const { id } = req.params;
    const limit = 20;

    if (!userId || !id || !description) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const [insertReply] = await db
      .insert(videoReplies)
      .values({
        userId: Number(userId),
        videoCommentId: Number(id),
        description,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    let newVideoReplyMedia: any[] = [];
    if (req.files) {
      for (const file of req.files as Express.Multer.File[]) {
        try {
          const uniqueKey = `${insertReply.id}-${crypto.randomUUID()}-${
            file.originalname
          }`;
          const url = await uploadVideoToCloudflare(
            uniqueKey,
            file.buffer,
            file.mimetype
          );
          const [media] = await db
            .insert(videoReplyMedias)
            .values({
              videoReplyId: insertReply.id,
              url: url,
              urlForDeletion: uniqueKey,
              mediaType: file.mimetype.startsWith("video") ? "video" : "image",
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();
          newVideoReplyMedia.push(media);
        } catch (error) {
          console.error("Error uploading file or saving media:", error);
        }
      }
    }

    const [username] = await db
      .select({ firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, Number(userId)));
    const replyWithMedia = {
      id: insertReply.id,
      userId: insertReply.userId,
      videoCommentId: insertReply.videoCommentId,
      description: insertReply.description,
      createdAt: insertReply.createdAt,
      updatedAt: insertReply.updatedAt,
      username: username.firstName + " " + username.lastName,
      media: newVideoReplyMedia.map((m) => ({
        url: m.url,
        type: m.mediaType,
      })),
    };

    let { currentReplyAmount, lastPage } = JSON.parse(
      (await redis.get(`videoReplies:comment:${id}:lastPage`)) ||
        JSON.stringify({ currentReplyAmount: 0, lastPage: 1 })
    );

    if (currentReplyAmount >= limit) {
      lastPage += 1;
      currentReplyAmount = 1;
    } else {
      currentReplyAmount += 1;
    }

    const cacheKey = `videoReplies:comment:${id}:page:${lastPage}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      const parsed = JSON.parse(cached);
      parsed.repliesWithMedia.push(replyWithMedia);
      await redis.set(cacheKey, JSON.stringify(parsed), { EX: 600 });
    } else {
      await redis.set(
        cacheKey,
        JSON.stringify({ repliesWithMedia: [replyWithMedia] }),
        { EX: 600 }
      );
    }

    await redis.set(
      `videoReplies:comment:${id}:lastPage`,
      JSON.stringify({ currentReplyAmount, lastPage }),
      {
        EX: 600,
      }
    );

    return res.status(201).json({
      success: true,
      reply: insertReply,
      newVideoReplyMedia,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const updateForumVideoReply = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: "1" };
    const { id } = req.params;
    const { description, videosToRemove } = req.body;

    const [doesUserOwnThisReply] = await db
      .select()
      .from(videoReplies)
      .where(
        and(
          eq(videoReplies.id, Number(id)),
          eq(videoReplies.userId, Number(userId))
        )
      )
      .limit(1);

    if (!doesUserOwnThisReply) {
      return res
        .status(404)
        .json({ success: false, message: "Video reply not found" });
    }

    let videosToRemoveParse: { url: string }[] = [];
    if (videosToRemove) {
      try {
        videosToRemoveParse =
          typeof videosToRemove === "string"
            ? JSON.parse(videosToRemove)
            : videosToRemove;
      } catch (err) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid videosToRemove format" });
      }
    }

    let newVideoReplyMedia: any[] = [];
    if (req.files) {
      for (const file of req.files as Express.Multer.File[]) {
        try {
          const uniqueKey = `${id}-${crypto.randomUUID()}-${file.originalname}`;
          const url = await uploadVideoToCloudflare(
            uniqueKey,
            file.buffer,
            file.mimetype
          );
          const [media] = await db
            .insert(videoReplyMedias)
            .values({
              videoReplyId: Number(id),
              url: url,
              urlForDeletion: uniqueKey,
              mediaType: file.mimetype.startsWith("video") ? "video" : "image",
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning();
          newVideoReplyMedia.push(media);
        } catch (error) {
          console.error("Error uploading file or saving media:", error);
        }
      }
    }

    let deleteMedia = null;
    if (videosToRemoveParse && videosToRemoveParse.length > 0) {
      const deleteResults = await Promise.all(
        videosToRemoveParse.map(async (mediaToRemove: any) => {
          const [urlForDeletion] = await db
            .select({ urlForDeletion: videoReplyMedias.urlForDeletion })
            .from(videoReplyMedias)
            .where(eq(videoReplyMedias.url, mediaToRemove.url));
          let deleted = null;
          if (urlForDeletion) {
            await deleteFromCloudflare(
              "komplex-image",
              urlForDeletion.urlForDeletion ?? ""
            );
            deleted = await db
              .delete(videoReplyMedias)
              .where(
                and(
                  eq(videoReplyMedias.videoReplyId, Number(id)),
                  eq(
                    videoReplyMedias.urlForDeletion,
                    urlForDeletion.urlForDeletion ?? ""
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

    const [updateReply] = await db
      .update(videoReplies)
      .set({
        description,
        updatedAt: new Date(),
      })
      .where(eq(videoReplies.id, Number(id)))
      .returning();

    const pattern = `videoReplies:comment:${updateReply.videoCommentId}:page:*`;
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

    await redis.del(
      `videoReplies:comment:${updateReply.videoCommentId}:lastPage`
    );

    return res
      .status(200)
      .json({ updateReply, newVideoReplyMedia, deleteMedia });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const deleteForumVideoReply = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: "1" };
    const { id } = req.params;

    const [doesUserOwnThisReply] = await db
      .select()
      .from(videoReplies)
      .where(
        and(
          eq(videoReplies.id, Number(id)),
          eq(videoReplies.userId, Number(userId))
        )
      )
      .limit(1);

    if (!doesUserOwnThisReply) {
      return res
        .status(404)
        .json({ success: false, message: "Video reply not found" });
    }
    const result = await deleteVideoReply(Number(userId), Number(id), null);

    return res.status(200).json({
      success: true,
      message: "Video reply deleted successfully",
      ...result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const deleteVideoReply = async (
  userId: number,
  videoReplyId: number | null,
  commentId: number | null
) => {
  if (videoReplyId === null && commentId === null) {
    throw new Error("Either videoReplyId or commentId must be provided");
  }

  if (videoReplyId && commentId === null) {
    const mediaToDelete = await db
      .select({ urlForDeletion: videoReplyMedias.urlForDeletion })
      .from(videoReplyMedias)
      .where(eq(videoReplyMedias.videoReplyId, videoReplyId));

    for (const media of mediaToDelete) {
      await deleteFromCloudflare("komplex-image", media.urlForDeletion ?? "");
    }

    const deletedMedia = await db
      .delete(videoReplyMedias)
      .where(eq(videoReplyMedias.videoReplyId, videoReplyId))
      .returning({
        url: videoReplyMedias.url,
        mediaType: videoReplyMedias.mediaType,
      });
    const deleteLikeReply = await db
      .delete(videoReplyLike)
      .where(eq(videoReplyLike.videoReplyId, videoReplyId))
      .returning();
    const deletedReply = await db
      .delete(videoReplies)
      .where(
        and(eq(videoReplies.id, videoReplyId), eq(videoReplies.userId, userId))
      )
      .returning();

    const pattern = `videoReplies:comment:${deletedReply[0]?.videoCommentId}:page:*`;
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
    await redis.del(
      `videoReplies:comment:${deletedReply[0]?.videoCommentId}:lastPage`
    );

    return { deletedReply, deletedMedia, deleteLikeReply };
  }

  if (commentId && videoReplyId === null) {
    const getVideoReplyIdByCommentId = await db
      .select({ id: videoReplies.id })
      .from(videoReplies)
      .where(eq(videoReplies.videoCommentId, commentId));
    const videoReplyIds = getVideoReplyIdByCommentId.map((r) => r.id);

    const mediaToDelete = await db
      .select({ urlForDeletion: videoReplyMedias.urlForDeletion })
      .from(videoReplyMedias)
      .where(
        videoReplyIds.length > 0
          ? inArray(videoReplyMedias.videoReplyId, videoReplyIds)
          : eq(videoReplyMedias.videoReplyId, -1)
      );

    for (const media of mediaToDelete) {
      await deleteFromCloudflare("komplex-image", media.urlForDeletion ?? "");
    }

    const deletedMedia = await db
      .delete(videoReplyMedias)
      .where(
        videoReplyIds.length > 0
          ? inArray(videoReplyMedias.videoReplyId, videoReplyIds)
          : eq(videoReplyMedias.videoReplyId, -1)
      )
      .returning({
        url: videoReplyMedias.url,
        mediaType: videoReplyMedias.mediaType,
      });
    const deleteLikeReply = await db
      .delete(videoReplyLike)
      .where(
        videoReplyIds.length > 0
          ? inArray(videoReplyLike.videoReplyId, videoReplyIds)
          : eq(videoReplyLike.videoReplyId, -1)
      )
      .returning();
    const deletedReply = await db
      .delete(videoReplies)
      .where(
        videoReplyIds.length > 0
          ? inArray(videoReplies.id, videoReplyIds)
          : eq(videoReplies.id, -1)
      )
      .returning();

    const pattern = `videoReplies:comment:${commentId}:page:*`;
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
    await redis.del(`videoReplies:comment:${commentId}:lastPage`);

    return { deletedReply, deletedMedia, deleteLikeReply };
  }
};

export const likeForumVideoReply = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const like = await db
      .insert(videoReplyLike)
      .values({
        userId: Number(userId),
        videoReplyId: Number(id),
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

export const unlikeForumVideoReply = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const unlike = await db
      .delete(videoReplyLike)
      .where(
        and(
          eq(videoReplyLike.userId, Number(userId)),
          eq(videoReplyLike.videoReplyId, Number(id))
        )
      )
      .returning();

    return res.status(200).json({ unlike });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};
