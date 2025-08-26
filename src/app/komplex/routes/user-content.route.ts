import { Router } from "express";
import {
  getAllUserBlogs,
  getBlogById,
  postBlog,
  saveBlog,
  unsaveBlog,
  updateBlog,
  deleteBlog,
} from "../controllers/user-content/user-content-blogs.controller";
import {
  getAllForums,
  getForumById,
  likeForum,
  postForum,
  unlikeForum,
  updateForum,
  deleteForum,
} from "../controllers/user-content/user-content-forums.controller";
import {
  getExerciseDashboard,
  getExerciseHistory,
  getExercises,
  getExerciseById,
} from "../controllers/user-content/user-content-exercises.controller";
import { getUserContentDashboard } from "../controllers/user-content/user-content-dashboard.controller";
import { uploadImages } from "../../middleware/upload";

const router = Router();

router.get("/dashboard", getUserContentDashboard);

router.get("/blogs", getAllUserBlogs);
router.get("/blogs/:id", getBlogById);
router.post("/blogs", uploadImages.array("images", 4), postBlog);
router.patch("/blogs/:id/save", saveBlog);
router.patch("/blogs/:id/unsave", unsaveBlog);
router.put("/blogs/:id", uploadImages.array("images", 4), updateBlog);
router.delete("/blogs/:id", deleteBlog);

router.get("/forums", getAllForums);
router.get("/forums/:id", getForumById);
router.post("/forums", postForum);
router.patch("/forums/:id/like", likeForum);
router.patch("/forums/:id/unlike", unlikeForum);
router.put("/forums/:id", updateForum);
router.delete("/forums/:id", deleteForum);

router.get("/exercises/history", getExerciseHistory);
router.get("/exercises/dashboard", getExerciseDashboard);
router.get("/exercises", getExercises);
router.get("/exercises/:id", getExerciseById);

export default router;
