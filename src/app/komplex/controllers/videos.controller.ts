import { Request, Response } from "express";
import { db } from "../../../db/index.js";
import { blogs, choices, exercises, questions as questionsTable, users, userSavedBlogs, userSavedVideos, userVideoHistory, videoComments, videoLikes, videos } from "../../../db/schema.js";
import { and, eq, sql, desc, inArray } from "drizzle-orm";
import { deleteVideoCommentInternal } from "./video_comments.controller.js";
import {
	deleteFromCloudflare,
	uploadImageToCloudflare,
	uploadVideoToCloudflare,
} from "../../../db/cloudflare/cloudflareFunction.js";
import fs from "fs";
import { redis } from "../../../db/redis/redisConfig.js";
import { AuthenticatedRequest } from "../../../types/request.js";

// export const postVideo = async (req: AuthenticatedRequest, res: Response) => {
//   let videoFile: Express.Multer.File | undefined;
//   let thumbnailFile: Express.Multer.File | undefined;

//   try {
//     const userId = req.user?.userId ?? "1";
//     const { title, description, topic, type } = req.body;

//     if (!title || !description || !topic || !type) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Missing required fields" });
//     }

//     if (
//       req.files &&
//       typeof req.files === "object" &&
//       "video" in req.files &&
//       "image" in req.files
//     ) {
//       videoFile = (req.files as { [fieldname: string]: Express.Multer.File[] })
//         .video[0];
//       thumbnailFile = (
//         req.files as { [fieldname: string]: Express.Multer.File[] }
//       ).image[0];
//     } else {
//       return res.status(400).json({ error: "Files not uploaded correctly" });
//     }

//     const uniqueKey = `${videoFile.filename}-${crypto.randomUUID()}-${
//       thumbnailFile.filename
//     }`;

//     const videoUrl = await uploadVideoToCloudflare(
//       uniqueKey,
//       await fs.promises.readFile(videoFile.path),
//       videoFile.mimetype
//     );

//     const thumbnailUrl = await uploadImageToCloudflare(
//       uniqueKey,
//       await fs.promises.readFile(thumbnailFile.path),
//       thumbnailFile.mimetype
//     );

//     const newVideo = await db
//       .insert(videos)
//       .values({
//         videoUrlForDeletion: uniqueKey,
//         videoUrl,
//         title,
//         description,
//         duration: 100,
//         topic,
//         type,
//         viewCount: 0,
//         thumbnailUrl,
//         thumbnailUrlForDeletion: uniqueKey,
//         userId: Number(userId),
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       })
//       .returning();

//     return res.status(201).json({ success: true, video: newVideo });
//   } catch (error) {
//     console.error("Error uploading file or saving media:", error);
//     return res
//       .status(500)
//       .json({ success: false, error: (error as Error).message });
//   } finally {
//     if (videoFile) await fs.promises.unlink(videoFile.path).catch(() => {});
//     if (thumbnailFile)
//       await fs.promises.unlink(thumbnailFile.path).catch(() => {});
//   }
// };

export const postVideoPresigned = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: 1 };
    const {
      videoKey,
      title,
      description,
      topic,
      type,
      thumbnailKey,
      questions,
    } = req.body;

    // Validate that the user exists
    const userExists = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, Number(userId)))
      .limit(1);

    if (userExists.length === 0) {
      return res.status(400).json({
        success: false,
        error: `User with ID ${userId} does not exist`,
      });
    }

    const videoUrl = `${process.env.R2_VIDEO_PUBLIC_URL}/${videoKey}`;
    const thumbnailUrl = `${process.env.R2_PHOTO_PUBLIC_URL}/${thumbnailKey}`;

    const newVideo = await db
      .insert(videos)
      .values({
        videoUrlForDeletion: videoKey,
        videoUrl,
        thumbnailUrlForDeletion: thumbnailKey,
        thumbnailUrl,
        title,
        description,
        topic,
        type,
        viewCount: 0,
        duration: 0,
        userId: Number(userId),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Create exercise for video quiz
    console.log(questions);

    // questions
    // :
    // [{title: "1+1", choices: [{text: "2", isCorrect: true}, {text: "3", isCorrect: false}]}]
    // 0
    // :
    // {title: "1+1", choices: [{text: "2", isCorrect: true}, {text: "3", isCorrect: false}]}

    const newExercise = await db
      .insert(exercises)
      .values({
        videoId: newVideo[0].id,
        title: `Quiz for ${title}`,
        description: `Multiple choice questions for the video: ${title}`,
        subject: topic || "General",
        grade: "All",
        duration: 0,
        userId: Number(userId),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    for (const question of questions) {
      const newQuestion = await db
        .insert(questionsTable)
        .values({
          exerciseId: newExercise[0].id,
          title: question.title,
          questionType: "",
          section: "",
          imageUrl: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      for (const choice of question.choices) {
        await db.insert(choices).values({
          questionId: newQuestion[0].id,
          text: choice.text,
          isCorrect: choice.isCorrect,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return res.status(201).json({ success: true, video: newVideo });
  } catch (error) {
    console.error("postVideoPresigned error:", error);
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
      details: error instanceof Error ? error.stack : "Unknown error",
    });
  }
};

export const getAllVideos = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: 1 };
    const { topic, type } = req.query;
    const conditions = [];
    if (topic) conditions.push(eq(videos.topic, topic as string));
    if (type) conditions.push(eq(videos.type, type as string));

    const videoRows = await db
      .select({
        id: videos.id,
        userId: videos.userId,
        title: videos.title,
        description: videos.description,
        duration: videos.duration,
        videoUrl: videos.videoUrl,
        thumbnailUrl: videos.thumbnailUrl,
        videoUrlForDeletion: videos.videoUrlForDeletion,
        thumbnailUrlForDeletion: videos.thumbnailUrlForDeletion,
        viewCount: videos.viewCount,
        createdAt: videos.createdAt,
        updatedAt: videos.updatedAt,
        username: sql`${users.firstName} || ' ' || ${users.lastName}`,
        isSave: sql`CASE WHEN ${userSavedVideos.videoId} IS NOT NULL THEN true ELSE false END`,
        isLike: sql`CASE WHEN ${videoLikes.videoId} IS NOT NULL THEN true ELSE false END`,
        likeCount: sql`COUNT(DISTINCT ${videoLikes.id})`,
        saveCount: sql`COUNT(DISTINCT ${userSavedVideos.id})`,
      })
      .from(videos)
      .leftJoin(users, eq(videos.userId, users.id))
      .leftJoin(
        userSavedVideos,
        and(
          eq(userSavedVideos.videoId, videos.id),
          eq(userSavedVideos.userId, Number(userId))
        )
      )
      .leftJoin(
        videoLikes,
        and(
          eq(videoLikes.videoId, videos.id),
          eq(videoLikes.userId, Number(userId))
        )
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(
        videos.id,
        users.firstName,
        users.lastName,
        userSavedVideos.videoId,
        videoLikes.videoId,
        userSavedVideos.id,
        videoLikes.id
      );

    return res.status(200).json(videoRows);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: (error as Error).message });
  }
};

export const getVideoById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user ?? { userId: 1 };
    const videoId = Number(req.params.id);

    if (!videoId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing video id" });
    }

    const [videoRow] = await db
      .select({
        id: videos.id,
        userId: videos.userId,
        title: videos.title,
        description: videos.description,
        duration: videos.duration,
        videoUrl: videos.videoUrl,
        thumbnailUrl: videos.thumbnailUrl,
        videoUrlForDeletion: videos.videoUrlForDeletion,
        thumbnailUrlForDeletion: videos.thumbnailUrlForDeletion,
        viewCount: videos.viewCount,
        createdAt: videos.createdAt,
        updatedAt: videos.updatedAt,
        username: sql`${users.firstName} || ' ' || ${users.lastName}`,
        isSave: sql`CASE WHEN ${userSavedVideos.videoId} IS NOT NULL THEN true ELSE false END`,
        isLike: sql`CASE WHEN ${videoLikes.videoId} IS NOT NULL THEN true ELSE false END`,
        likeCount: sql`COUNT(DISTINCT ${videoLikes.id})`,
        saveCount: sql`COUNT(DISTINCT ${userSavedVideos.id})`,
      })
      .from(videos)
      .leftJoin(users, eq(videos.userId, users.id))
      .leftJoin(
        userSavedVideos,
        and(
          eq(userSavedVideos.videoId, videos.id),
          eq(userSavedVideos.userId, Number(userId))
        )
      )
      .leftJoin(
        videoLikes,
        and(
          eq(videoLikes.videoId, videos.id),
          eq(videoLikes.userId, Number(userId))
        )
      )
      .where(eq(videos.id, videoId))
      .groupBy(
        videos.id,
        users.firstName,
        users.lastName,
        userSavedVideos.videoId,
        videoLikes.videoId,
        userSavedVideos.id,
        videoLikes.id
      );
    // increment view count
    await db
      .update(videos)
      .set({
        viewCount: (videoRow.viewCount ?? 0) + 1,
      })
      .where(eq(videos.id, videoId));

    // insert into history
    await db.insert(userVideoHistory).values({
      userId: Number(userId),
      videoId: videoId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (!videoRow) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }

    return res.status(200).json(videoRow);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: (error as Error).message });
  }
};

export const likeVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const like = await db
      .insert(videoLikes)
      .values({
        userId: Number(userId),
        videoId: Number(id),
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

export const unlikeVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: 1 };

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const unlike = await db
      .delete(videoLikes)
      .where(
        and(
          eq(videoLikes.userId, Number(userId)),
          eq(videoLikes.videoId, Number(id))
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

export const saveVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: "1" };

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const videoToSave = await db.insert(userSavedVideos).values({
      userId: Number(userId),
      videoId: Number(id),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return res.status(200).json({
      success: true,
      message: "Video saved successfully",
      video: videoToSave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const unsaveVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: "1" };

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const videoToUnsave = await db
      .delete(userSavedVideos)
      .where(
        and(
          eq(userSavedVideos.userId, Number(userId)),
          eq(userSavedVideos.videoId, Number(id))
        )
      )
      .returning();

    if (!videoToUnsave || videoToUnsave.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Video unsaved successfully",
      video: videoToUnsave,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const updateVideo = async (req: AuthenticatedRequest, res: Response) => {
  let videoFile: Express.Multer.File | undefined;
  let thumbnailFile: Express.Multer.File | undefined;

  try {
    const { userId } = req.user ?? { userId: "1" };
    const { id } = req.params;
    const { title, description, type, topic } = req.body;

    if (!id || !title || !description || !type || !topic) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const [doesUserOwnThisVideo] = await db
      .select()
      .from(videos)
      .where(and(eq(videos.id, Number(id)), eq(videos.userId, Number(userId))))
      .limit(1);

    if (!doesUserOwnThisVideo) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }

    if (
      req.files &&
      typeof req.files === "object" &&
      "video" in req.files &&
      "image" in req.files
    ) {
      videoFile = (req.files as { [fieldname: string]: Express.Multer.File[] })
        .video[0];
      thumbnailFile = (
        req.files as { [fieldname: string]: Express.Multer.File[] }
      ).image[0];
    }

    const uniqueKey =
      videoFile && thumbnailFile
        ? `${videoFile.filename}-${crypto.randomUUID()}-${
            thumbnailFile.filename
          }`
        : crypto.randomUUID();

    let newVideoUrl: string | null = null;
    if (videoFile) {
      const [videoUrlForDeletionForThisVideo] = await db
        .select({ videoUrlForDeletion: videos.videoUrlForDeletion })
        .from(videos)
        .where(eq(videos.id, Number(id)))
        .limit(1);

      await deleteFromCloudflare(
        "komplex-video",
        videoUrlForDeletionForThisVideo.videoUrlForDeletion ?? ""
      );
      newVideoUrl = await uploadVideoToCloudflare(
        uniqueKey,
        await fs.promises.readFile(videoFile.path),
        videoFile.mimetype
      );
    }

    let newThumbnailUrl: string | null = null;
    if (thumbnailFile) {
      const [thumbnailUrlForDeletionForThisVideo] = await db
        .select({ thumbnailUrlForDeletion: videos.thumbnailUrlForDeletion })
        .from(videos)
        .where(eq(videos.id, Number(id)))
        .limit(1);

      await deleteFromCloudflare(
        "komplex-video",
        thumbnailUrlForDeletionForThisVideo.thumbnailUrlForDeletion ?? ""
      );
      newThumbnailUrl = await uploadImageToCloudflare(
        uniqueKey,
        await fs.promises.readFile(thumbnailFile.path),
        thumbnailFile.mimetype
      );
    }

    const updateData: Partial<typeof videos.$inferInsert> = {
      title,
      description,
      type,
      topic,
      updatedAt: new Date(),
    };

    if (newVideoUrl) {
      updateData.videoUrl = newVideoUrl;
      updateData.videoUrlForDeletion = uniqueKey;
    }

    if (newThumbnailUrl) {
      updateData.thumbnailUrl = newThumbnailUrl;
      updateData.thumbnailUrlForDeletion = uniqueKey;
    }

		const [updateVideoResult] = await db
			.update(videos)
			.set(updateData)
			.where(eq(videos.id, Number(id)))
			.returning();

		// Fetch updated video with media and username
		const video = await db
			.select({
				id: videos.id,
				userId: videos.userId,
				title: videos.title,
				description: videos.description,
				type: videos.type,
				topic: videos.topic,
				duration: videos.duration,
				videoUrl: videos.videoUrl,
				thumbnailUrl: videos.thumbnailUrl,
				createdAt: videos.createdAt,
				updatedAt: videos.updatedAt,
				username: sql`${users.firstName} || ' ' || ${users.lastName}`,
				viewCount: videos.viewCount,
			})
			.from(videos)
			.leftJoin(users, eq(videos.userId, users.id))
			.where(eq(videos.id, Number(id)));

		const videoWithMedia = {
			id: video[0].id,
			userId: video[0].userId,
			title: video[0].title,
			description: video[0].description,
			type: video[0].type,
			topic: video[0].topic,
			duration: video[0].duration,
			videoUrl: video[0].videoUrl,
			thumbnailUrl: video[0].thumbnailUrl,
			createdAt: video[0].createdAt,
			updatedAt: video[0].updatedAt,
			username: video[0].username,
			viewCount: video[0].viewCount,
		};

		// Update Redis cache
		await redis.del(`videos:${id}`);
		await redis.set(`videos:${id}`, JSON.stringify(videoWithMedia), { EX: 600 });

		return res.status(200).json({ success: true, updateVideo: updateVideoResult });
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	} finally {
		// cleanup temp files
		if (videoFile) await fs.promises.unlink(videoFile.path).catch(() => {});
		if (thumbnailFile) await fs.promises.unlink(thumbnailFile.path).catch(() => {});
	}
};

export const deleteVideo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.user ?? { userId: "1" };
    const { id } = req.params;

    // Check ownership
    const [doesThisUserOwnThisVideo] = await db
      .select({
        videoUrlForDeletion: videos.videoUrlForDeletion,
        thumbnailUrlForDeletion: videos.thumbnailUrlForDeletion,
      })
      .from(videos)
      .where(and(eq(videos.id, Number(id)), eq(videos.userId, Number(userId))));

    if (!doesThisUserOwnThisVideo) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found or unauthorized" });
    }

    const [doesThisVideoHasComments] = await db
      .select()
      .from(videoComments)
      .where(eq(videoComments.videoId, Number(id)))
      .limit(1);

    let deleteComments = null;
    if (doesThisVideoHasComments) {
      // If the video has comments, we need to delete them as well
      deleteComments = await deleteVideoCommentInternal(
        Number(userId),
        null,
        Number(id)
      );
    }

    // Delete likes
    const deletedLikes = await db
      .delete(videoLikes)
      .where(eq(videoLikes.videoId, Number(id)))
      .returning();

    // Delete saves
    const deletedSaves = await db
      .delete(userSavedVideos)
      .where(eq(userSavedVideos.videoId, Number(id)))
      .returning();

    // Delete from cloudflare
    if (doesThisUserOwnThisVideo.videoUrlForDeletion) {
      try {
        await deleteFromCloudflare(
          "komplex-video",
          doesThisUserOwnThisVideo.videoUrlForDeletion
        );
      } catch (err) {
        console.error("Failed to delete video from Cloudflare:", err);
      }
    }

    if (doesThisUserOwnThisVideo.thumbnailUrlForDeletion) {
      try {
        await deleteFromCloudflare(
          "komplex-image",
          doesThisUserOwnThisVideo.thumbnailUrlForDeletion
        );
      } catch (err) {
        console.error("Failed to delete thumbnail from Cloudflare:", err);
      }
    }

    // Delete video record
    const deletedVideo = await db
      .delete(videos)
      .where(and(eq(videos.id, Number(id)), eq(videos.userId, Number(userId))))
      .returning();

		// Remove from Redis cache
		await redis.del(`videos:${id}`);

		return res.status(200).json({
			success: true,
			message: "Video deleted successfully",
			deletedVideo,
			deletedLikes,
			deletedSaves,
			deleteComments,
		});
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const getVideoExercise = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    // const { userId } = req.user ?? { userId: "1" };

    const videoExercise = await db
      .select()
      .from(exercises)
      .where(eq(exercises.videoId, Number(id)));

    const exerciseQuestions = await db
      .select()
      .from(questionsTable)
      .where(eq(questionsTable.exerciseId, videoExercise[0].id));
    let exerciseQuestionsWithChoices = [];
    for (const question of exerciseQuestions) {
      const exerciseChoices = await db
        .select()
        .from(choices)
        .where(eq(choices.questionId, question.id));
      exerciseQuestionsWithChoices.push({
        ...question,
        choices: exerciseChoices,
      });
    }

    return res.status(200).json(exerciseQuestionsWithChoices);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const updateVideoExercise = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: "1" };

    const { questions } = req.body;

    const [exercise] = await db
      .select()
      .from(exercises)
      .where(eq(exercises.videoId, Number(id)));

    if (!exercise) {
      return res
        .status(404)
        .json({ success: false, message: "Exercise not found" });
    }

    await db
      .update(exercises)
      .set({
        title: exercise.title,
        description: exercise.description,
        subject: exercise.subject,
        grade: exercise.grade,
        duration: exercise.duration,
        updatedAt: new Date(),
      })
      .where(eq(exercises.id, exercise.id));

    for (const question of questions) {
      const [existingQuestion] = await db
        .select()
        .from(questionsTable)
        .where(eq(questionsTable.exerciseId, exercise.id));

      if (!existingQuestion) {
        await db.insert(questionsTable).values({
          exerciseId: exercise.id,
          title: question.title,
          questionType: "",
          section: "",
          imageUrl: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      for (const choice of question.choices) {
        // Check if choice has an ID (existing choice) or not (new choice)
        if (choice.id && !isNaN(Number(choice.id))) {
          // Update existing choice
          const [existingChoice] = await db
            .select()
            .from(choices)
            .where(eq(choices.id, Number(choice.id)));

          if (existingChoice) {
            await db
              .update(choices)
              .set({
                text: choice.text,
                isCorrect: choice.isCorrect,
                updatedAt: new Date(),
              })
              .where(eq(choices.id, Number(choice.id)));
          }
        } else {
          // Insert new choice
          await db.insert(choices).values({
            questionId: existingQuestion.id,
            text: choice.text,
            isCorrect: choice.isCorrect,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

export const updateVideoPresignedUrl = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user ?? { userId: "1" };
    //   // Update video data
    //   await axios.put(`http://localhost:6969/videos/${video.id}`, {
    // 	title: formData.title,
    // 	description: formData.description,
    // 	videoKey: videoKey,
    // 	thumbnailKey: thumbnailKey,
    // });

    const { title, description, videoKey, thumbnailKey } = req.body;

    const videoUrl = `${process.env.R2_VIDEO_PUBLIC_URL}/${videoKey}`;
    const thumbnailUrl = `${process.env.R2_PHOTO_PUBLIC_URL}/${thumbnailKey}`;

    const [video] = await db
      .select()
      .from(videos)
      .where(eq(videos.id, Number(id)))
      .limit(1);

    if (!video) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }

    // delete video from cloudflare
    deleteFromCloudflare("komplex-video", video.videoUrlForDeletion ?? "");

    // delete thumbnail from cloudflare
    deleteFromCloudflare("komplex-image", video.thumbnailUrlForDeletion ?? "");

    await db
      .update(videos)
      .set({
        title,
        description,
        videoUrl: videoUrl,
        thumbnailUrl: thumbnailUrl,
        videoUrlForDeletion: videoKey,
        thumbnailUrlForDeletion: thumbnailKey,
        updatedAt: new Date(),
      })
      .where(eq(videos.id, Number(id)));

    return res.status(200).json({ success: true, video });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};
