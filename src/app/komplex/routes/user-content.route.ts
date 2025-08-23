import { Router } from "express";
import {
  getAllUserBlogs,
  getBlogById,
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

const router = Router();

router.get("/dashboard", getUserContentDashboard);

router.get("/blogs", getAllUserBlogs);
router.get("/blogs/:id", getBlogById);

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
