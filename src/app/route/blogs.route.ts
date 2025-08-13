import { Router } from "express";
import { postBlog, getAllBlogs, getBlogById, likeBlog, updateBlog, deleteBlog } from "../controller/blogs.controller";
import upload from "../middleware/upload";
const router = Router();

// Get all blogs
router.get("/", getAllBlogs);

// Get blog by ID
router.get("/:id", getBlogById);

// Create a new blog
router.post("/", upload.any(), postBlog);

// Like a blog
router.post("/like", likeBlog);

// Update a blog
router.put("/:id", updateBlog);

// Delete a blog
router.delete("/:id", deleteBlog);

export default router;
