import { Router } from "express";
import {
  getAllUserBlogs,
  getBlogById,
  postBlog,
  saveBlog,
  unsaveBlog,
  updateBlog,
  deleteBlog,
} from "../controllers/user-content-blogs.controller";
import {
  getAllForums,
  getForumById,
  likeForum,
  postForum,
  unlikeForum,
  updateForum,
} from "../controllers/user-content-forums.controller";
import { deleteForum } from "../controllers/forums.controller";
import {
  getExerciseDashboard,
  getExerciseHistory,
  getExercises,
  getExerciseById,
} from "../controllers/user-content-exercises.controller";
import { getUserContentDashboard } from "../controllers/user-content-dashboard.controller";
import upload from "../../middleware/upload";

const router = Router();

router.get("/dashboard", getUserContentDashboard);

router.get("/blogs", getAllUserBlogs);
router.get("/blogs/:id", getBlogById);
// Create a new blog
router.post("/blogs", upload.any(), postBlog);

// Save a blog
router.patch("/blogs/:id/save", saveBlog);
router.patch("/blogs/:id/unsave", unsaveBlog);

// Update a blog
router.put("/blogs/:id", upload.any(), updateBlog);

// Delete a blog
router.delete("/blogs/:id", deleteBlog);

router.get("/forums", getAllForums);
router.get("/forums/:id", getForumById);
router.post("/forums", postForum);
router.post("/forums/:id/like", likeForum);
router.post("/forums/:id/unlike", unlikeForum);
router.put("/forums/:id", updateForum);
router.delete("/forums/:id", deleteForum);

// router.get("/exercises/scores", getExerciseScores);
router.get("/exercises/history", getExerciseHistory);
router.get("/exercises/dashboard", getExerciseDashboard);
router.get("/exercises", getExercises);
router.get("/exercises/:id", getExerciseById);

export default router;
