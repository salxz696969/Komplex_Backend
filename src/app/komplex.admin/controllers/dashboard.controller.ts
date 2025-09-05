import { Request, Response } from "express";
import { db } from "../../../db/index.js";
import { sql } from "drizzle-orm";
import {
  users,
  blogs,
  videos,
  exercises,
  forums,
  forumComments,
  forumReplies,
  videoComments,
  videoReplies,
  userExerciseHistory,
  userVideoHistory,
  videoLikes,
  forumLikes,
} from "../../../db/schema.js";
import { eq } from "drizzle-orm";
import { redis } from "../../../db/redis/redisConfig.js";

interface DashboardData {
  // Key Performance Indicators
  totalUsers: number;
  activeUsers: number;
  totalContent: number;
  completionRate: number;

  // Content Breakdown
  totalBlogs: number;
  totalVideos: number;
  totalExercises: number;
  totalForums: number;

  // Engagement Metrics
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalReplies: number;

  // Recent Activities
  recentActivities: Array<{
    type: string;
    description: string;
  }>;
}

export const getDashboardData = async (req: Request, res: Response) => {
  try {
    // Get total users
    const cacheKey = `dashboard:totalUsers`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }
    const totalUsersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    const totalUsers = Number(totalUsersResult[0]?.count || 0);

    // Get active users (users who have interacted in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsersResult = await db
      .select({ count: sql<number>`count(distinct ${users.id})` })
      .from(users)
      .leftJoin(userExerciseHistory, eq(users.id, userExerciseHistory.userId))
      .leftJoin(userVideoHistory, eq(users.id, userVideoHistory.userId))
      .leftJoin(forumComments, eq(users.id, forumComments.userId))
      .leftJoin(videoComments, eq(users.id, videoComments.userId))
      .where(
        sql`(${userExerciseHistory.createdAt} > ${thirtyDaysAgo} OR 
             ${userVideoHistory.createdAt} > ${thirtyDaysAgo} OR 
             ${forumComments.createdAt} > ${thirtyDaysAgo} OR 
             ${videoComments.createdAt} > ${thirtyDaysAgo})`
      );
    const activeUsers = Number(activeUsersResult[0]?.count || 0);

    // Get content counts
    const totalBlogsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(blogs);
    const totalBlogs = Number(totalBlogsResult[0]?.count || 0);

    const totalVideosResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(videos);
    const totalVideos = Number(totalVideosResult[0]?.count || 0);

    const totalExercisesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(exercises);
    const totalExercises = Number(totalExercisesResult[0]?.count || 0);

    const totalForumsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(forums);
    const totalForums = Number(totalForumsResult[0]?.count || 0);

    const totalContent =
      totalBlogs + totalVideos + totalExercises + totalForums;

    // Get engagement metrics
    const totalViewsResult = await db
      .select({
        blogViews: sql<number>`COALESCE(SUM(${blogs.viewCount}), 0)`,
        videoViews: sql<number>`COALESCE(SUM(${videos.viewCount}), 0)`,
        forumViews: sql<number>`COALESCE(SUM(${forums.viewCount}), 0)`,
      })
      .from(blogs)
      .leftJoin(videos, sql`1=1`)
      .leftJoin(forums, sql`1=1`);

    const totalViews =
      Number(totalViewsResult[0]?.blogViews || 0) +
      Number(totalViewsResult[0]?.videoViews || 0) +
      Number(totalViewsResult[0]?.forumViews || 0);

    const totalLikesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(videoLikes);
    const videoLikesCount = Number(totalLikesResult[0]?.count || 0);

    const totalForumLikesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(forumLikes);
    const forumLikesCount = Number(totalForumLikesResult[0]?.count || 0);
    const totalLikes = videoLikesCount + forumLikesCount;

    const totalCommentsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(forumComments);
    const forumCommentsCount = Number(totalCommentsResult[0]?.count || 0);

    const totalVideoCommentsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(videoComments);
    const videoCommentsCount = Number(totalVideoCommentsResult[0]?.count || 0);
    const totalComments = forumCommentsCount + videoCommentsCount;

    const totalRepliesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(forumReplies);
    const forumRepliesCount = Number(totalRepliesResult[0]?.count || 0);

    const totalVideoRepliesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(videoReplies);
    const videoRepliesCount = Number(totalVideoRepliesResult[0]?.count || 0);
    const totalReplies = forumRepliesCount + videoRepliesCount;

    // Calculate completion rate (exercises completed vs total exercises)
    const completedExercisesResult = await db
      .select({
        count: sql<number>`count(distinct ${userExerciseHistory.exerciseId})`,
      })
      .from(userExerciseHistory);
    const completedExercises = Number(completedExercisesResult[0]?.count || 0);
    const completionRate =
      totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

    // Get recent activities
    const recentActivities: Array<{
      type: string;
      description: string;
    }> = [];

    // Recent user registrations
    const recentUsers = await db
      .select({
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(sql`${users.createdAt} DESC`)
      .limit(3);

    recentUsers.forEach((user) => {
      if (user.createdAt) {
        recentActivities.push({
          type: "user_registered",
          description: `${user.firstName} ${user.lastName} (${user.email})`,
        });
      }
    });

    // Recent video uploads
    const recentVideos = await db
      .select({
        title: videos.title,
        createdAt: videos.createdAt,
      })
      .from(videos)
      .orderBy(sql`${videos.createdAt} DESC`)
      .limit(3);

    recentVideos.forEach((video) => {
      if (video.createdAt) {
        recentActivities.push({
          type: "video_uploaded",
          description: `"${video.title}" uploaded`,
        });
      }
    });

    // Recent blog posts
    const recentBlogs = await db
      .select({
        title: blogs.title,
        createdAt: blogs.createdAt,
      })
      .from(blogs)
      .orderBy(sql`${blogs.createdAt} DESC`)
      .limit(3);

    recentBlogs.forEach((blog) => {
      if (blog.createdAt) {
        recentActivities.push({
          type: "blog_posted",
          description: `"${blog.title}" posted`,
        });
      }
    });

    // Recent forum posts
    const recentForums = await db
      .select({
        title: forums.title,
        createdAt: forums.createdAt,
      })
      .from(forums)
      .orderBy(sql`${forums.createdAt} DESC`)
      .limit(3);

    recentForums.forEach((forum) => {
      if (forum.createdAt) {
        recentActivities.push({
          type: "forum_posted",
          description: `"${forum.title}" posted`,
        });
      }
    });

    // Recent exercise completions
    const recentExerciseCompletions = await db
      .select({
        score: userExerciseHistory.score,
        exerciseId: userExerciseHistory.exerciseId,
        createdAt: userExerciseHistory.createdAt,
      })
      .from(userExerciseHistory)
      .orderBy(sql`${userExerciseHistory.createdAt} DESC`)
      .limit(3);

    recentExerciseCompletions.forEach((completion) => {
      if (completion.createdAt) {
        recentActivities.push({
          type: "exercise_completed",
          description: `Exercise ${completion.exerciseId} completed (Score: ${completion.score})`,
        });
      }
    });

    // Sort activities by type and take top 10
    const sortedActivities = recentActivities.slice(0, 10);

    const dashboardData: DashboardData = {
      // KPIs
      totalUsers,
      activeUsers,
      totalContent,
      completionRate: Math.round(completionRate * 100) / 100,

      // Content Breakdown
      totalBlogs,
      totalVideos,
      totalExercises,
      totalForums,

      // Engagement Metrics
      totalViews,
      totalLikes,
      totalComments,
      totalReplies,

      // Recent Activities
      recentActivities: sortedActivities,
    };
    await redis.set(cacheKey, JSON.stringify(dashboardData), { EX: 60 * 60 * 24 });

    return res.status(200).json(dashboardData);
  } catch (error: any) {
    console.error("Dashboard error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
};
