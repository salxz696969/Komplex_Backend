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

const router = Router();

router.get("/blogs", getAllUserBlogs);
router.get("/blogs/:id", getBlogById);

router.get("/forums", getAllForums);
router.get("/forums/:id", getForumById);
router.post("/forums", postForum);
router.post("/forums/:id/like", likeForum);
router.post("/forums/:id/unlike", unlikeForum);
router.put("/forums/:id", updateForum);
router.delete("/forums/:id", deleteForum);

export default router;
