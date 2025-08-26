import { Router } from "express";
import { getAllBlogs, getBlogById } from "../controllers/blogs.controller";
const router = Router();

// Get all blogs
router.get("/", getAllBlogs);
router.get("/:id", getBlogById);
export default router;
