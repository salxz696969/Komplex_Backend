import { Router } from "express";
import {
  getAllUserBlogs,
  getBlogById,
} from "../controllers/user-content-blogs.controller.js";
import { getUserContentDashboard  } from "../controllers/user-content/user-content-dashboard.controller.js";
import { uploadImages } from "../../../middleware/upload.js";
import { deleteBlog, postBlog, saveBlog, unsaveBlog, updateBlog } from "../controllers/user-content/user-content-blogs.controller.js";
import { postForum } from "../controllers/user-content/user-content-forums.controller.js";
import { getAllForums, getForumById } from "../controllers/forums.controller.js";
import { likeForum, unlikeForum } from "../controllers/forums.controller.js";
import { updateForum } from "../controllers/forums.controller.js";
import { deleteForum } from "../controllers/forums.controller.js";
import { getExerciseById, getExerciseDashboard, getExerciseHistory } from "../controllers/user-content/user-content-exercises.controller.js";
import { getExercises } from "../controllers/exercises.controller.js";
import { getAllVideos, getVideoById } from "../controllers/videos.controller.js";
import { getUserVideoHistory } from "../controllers/user-content/user-content-videos.controller.js";
import { getVideoLikes } from "../controllers/video_likes.controller.js";

const router = Router();

router.get("/dashboard", getUserContentDashboard);

router.get("/blogs", getAllUserBlogs as any);
router.get("/blogs/:id", getBlogById as any);
router.post("/blogs", uploadImages.array("images", 4), postBlog as any);
router.patch("/blogs/:id/save", saveBlog as any);
router.patch("/blogs/:id/unsave", unsaveBlog as any);
router.put("/blogs/:id", uploadImages.array("images", 4), updateBlog as any);
router.delete("/blogs/:id", deleteBlog as any);

router.get("/forums", getAllForums as any);
router.get("/forums/:id", getForumById as any);
router.post("/forums", uploadImages.array("images", 4), postForum as any);
router.patch("/forums/:id/like", likeForum as any);
router.patch("/forums/:id/unlike", unlikeForum as any);
router.put("/forums/:id", uploadImages.array("images", 4), updateForum as any);
router.delete("/forums/:id", deleteForum as any);

router.get("/exercises/history", getExerciseHistory as any);
router.get("/exercises/dashboard", getExerciseDashboard as any);
router.get("/exercises", getExercises as any);
router.get("/exercises/:id", getExerciseById);

router.get("/videos", getAllVideos as any);
router.get("/videos/:id", getVideoById as any);
router.get("/video_history", getUserVideoHistory as any);
router.get("/video_likes/:id", getVideoLikes as any);

export default router;
