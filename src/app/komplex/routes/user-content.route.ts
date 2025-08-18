import { Router } from "express";
import {
  getAllUserBlogs,
  getBlogById,
} from "../controllers/user-content-blogs.controller";

const router = Router();

router.get("/blogs", getAllUserBlogs);
router.get("/blogs/:id", getBlogById);

export default router;
