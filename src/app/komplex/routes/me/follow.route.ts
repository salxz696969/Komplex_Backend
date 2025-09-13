import { Router } from "express";
import {
	followUserController,
	unfollowUserController,
	getFollowingController,
	getUserFollowersController,
} from "../../controllers/me/followers.controller.js";
import { verifyFirebaseToken } from "@/middleware/auth.js";
import { followLimiter } from "@/middleware/redisLimiter.js";
// import // TODO: Need to check what functions exist for following
// import { getFollowersService } from './../../services/me/follow/service';
// followUser,
// // unfollowUser,
// // getFollowing,
// // getFollowers,
// "../../controllers/me/follow.controller.js";

const router = Router();

// Following functionality
// TODO: Implement these based on existing controller functions
router.get("/followers", verifyFirebaseToken as any, followLimiter, getUserFollowersController as any);
router.get("/following", verifyFirebaseToken as any, followLimiter, getFollowingController as any);
router.post("/follow/:id", verifyFirebaseToken as any, followLimiter, followUserController as any);
router.post("/unfollow/:id", verifyFirebaseToken as any, followLimiter, unfollowUserController as any);

export default router;
