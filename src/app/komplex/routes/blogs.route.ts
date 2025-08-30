import { Router } from "express";
import { getAllBlogs, getBlogById } from "../controllers/blogs.controller";
const router = Router();

// Get all blogs
router.get("/", getAllBlogs as any);
router.get("/:id", getBlogById as any);
export default router;
