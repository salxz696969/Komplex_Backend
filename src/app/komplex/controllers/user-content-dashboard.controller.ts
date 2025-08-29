import { Request, Response } from "express";
import { db } from "../../../db/index.js";
import { desc, eq } from "drizzle-orm";
import { blogs, exercises, forums, videos } from "../../../db/schema.js";

export const getUserContentDashboard = async (req: Request, res: Response) => {
  //   const { userId } = req.params;

  let userId = 1; // assume for now // TODO

  // number of blogs, number of vids, number of excercises compoleted, number of forums posted
  const dashboardData = {
    numOfBlogs: 0,
    numOfVideos: 0,
    numOfExercises: 0,
    numOfForums: 0,
  };
  const numOfBlogs = await db
    .select()
    .from(blogs)
    .where(eq(blogs.userId, Number(userId)));
  const numOfVids = await db
    .select()
    .from(videos)
    .where(eq(videos.userId, Number(userId)));
  const numOfExercisesCompleted = await db
    .select()
    .from(exercises)
    .where(eq(exercises.userId, Number(userId)));
  const numOfForumsPosted = await db
    .select()
    .from(forums)
    .where(eq(forums.userId, Number(userId)));

  dashboardData.numOfBlogs = numOfBlogs.length;
  dashboardData.numOfVideos = numOfVids.length;
  dashboardData.numOfExercises = numOfExercisesCompleted.length;
  dashboardData.numOfForums = numOfForumsPosted.length;

  // get recent activities, so we have to get the recently added excercise, blogs, forums that is by this user

  const recentBlogs = await db
    .select({
      title: blogs.title,
      createdAt: blogs.createdAt,
    })
    .from(blogs)
    .where(eq(blogs.userId, Number(userId)))
    .orderBy(desc(blogs.createdAt))
    .limit(5);
  const recentVideos = await db
    .select({
      title: videos.title,
      createdAt: videos.createdAt,
    })
    .from(videos)
    .where(eq(videos.userId, Number(userId)))
    .orderBy(desc(videos.createdAt))
    .limit(5);
  const recentExercises = await db
    .select({
      title: exercises.title,
      createdAt: exercises.createdAt,
    })
    .from(exercises)
    .where(eq(exercises.userId, Number(userId)))
    .orderBy(desc(exercises.createdAt))
    .limit(5);
  const recentForums = await db
    .select({
      title: forums.title,
      createdAt: forums.createdAt,
    })
    .from(forums)
    .where(eq(forums.userId, Number(userId)))
    .orderBy(desc(forums.createdAt))
    .limit(5);

  // Add contentType to each item and combine into single array
  const recentActivities = [
    ...recentBlogs.map((blog) => ({ ...blog, contentType: "blog" })),
    ...recentVideos.map((video) => ({ ...video, contentType: "video" })),
    ...recentExercises.map((exercise) => ({
      ...exercise,
      contentType: "exercise",
    })),
    ...recentForums.map((forum) => ({ ...forum, contentType: "forum" })),
  ];

  // Sort by createdAt (most recent first) and take top 5
  const sortedRecentActivities = recentActivities
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  console.log(sortedRecentActivities);

  return res
    .json({ dashboardData, recentActivities: sortedRecentActivities })
    .status(200);
};
