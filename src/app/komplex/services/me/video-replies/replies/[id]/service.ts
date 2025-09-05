import { db } from "@/db/index.js";
import { videoReplies, videoReplyMedias, videoReplyLike } from "@/db/schema.js";
import { AuthenticatedRequest } from "@/types/request.js";
import { Response } from "express";
import { uploadVideoToCloudflare } from "@/db/cloudflare/cloudflareFunction.js";
import { redis } from "@/db/redis/redisConfig.js";
import { and, eq, inArray } from "drizzle-orm";
import { deleteFromCloudflare } from "@/db/cloudflare/cloudflareFunction.js";

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
  