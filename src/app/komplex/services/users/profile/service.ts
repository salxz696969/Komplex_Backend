import { db } from "@/db/index.js";
import { redis } from "@/db/redis/redisConfig.js";
import {
  blogs,
  forumLikes,
  followers,
  forums,
  users,
  userSavedBlogs,
  userSavedVideos,
  videos,
  videoLikes,
} from "@/db/schema.js";
import { count, eq } from "drizzle-orm";

export const getUserProfile = async (userId: number) => {
  try {
    const cacheKey = `user:${userId}:profile`;

    const cachedProfile = await redis.get(cacheKey);
    if (cachedProfile) {
      return { data: JSON.parse(cachedProfile) };
    }
    const userProfile = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    const numberOfFollowers = await db
      .select({ count: count() })
      .from(followers)
      .where(eq(followers.followedId, userId));

    const numberOfFollowing = await db
      .select({ count: count() })
      .from(followers)
      .where(eq(followers.userId, userId));

    // number of saves that other user save their blogs
    const numberOfBlogsSaved = await db
      .select({ count: count() })
      .from(userSavedBlogs)
      .leftJoin(blogs, eq(userSavedBlogs.blogId, blogs.id))
      .where(eq(blogs.userId, userId));

    // number of forums likes that other user like their forums
    const numberOfForumLikes = await db
      .select({ count: count() })
      .from(forumLikes)
      .leftJoin(forums, eq(forumLikes.forumId, forums.id))
      .where(eq(forums.userId, userId));

    // number of videos saved that other user save their videos
    const numberOfVideosSaved = await db
      .select({ count: count() })
      .from(userSavedVideos)
      .leftJoin(videos, eq(userSavedVideos.videoId, videos.id))
      .where(eq(videos.userId, userId));

    // number of liked videos that other user like their videos
    const numberOfLikedVideos = await db
      .select({ count: count() })
      .from(videoLikes)
      .leftJoin(videos, eq(videoLikes.videoId, videos.id))
      .where(eq(videos.userId, userId));

    const totalLikesAndSaves =
      numberOfBlogsSaved[0].count +
      numberOfForumLikes[0].count +
      numberOfVideosSaved[0].count +
      numberOfLikedVideos[0].count;

    await redis.set(
      cacheKey,
      JSON.stringify({
        ...userProfile[0],
        numberOfFollowers: numberOfFollowers[0].count,
        numberOfFollowing: numberOfFollowing[0].count,
        totalLikesAndSaves: totalLikesAndSaves,
      }),
      { EX: 300 }
    );
    return {
      data: {
        ...userProfile[0],
        numberOfFollowers: numberOfFollowers[0].count,
        numberOfFollowing: numberOfFollowing[0].count,
        totalLikesAndSaves: totalLikesAndSaves,
      },
    };
  } catch (error) {
    throw new Error("Failed to get user profile");
  }
};
