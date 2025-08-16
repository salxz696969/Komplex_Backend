import { Router } from "express";
import {
	postBlog,
	getAllBlogs,
	getBlogById,
	saveBlog,
	updateBlog,
	deleteBlog,
	unsaveBlog,
} from "../controller/blogs.controller";
import upload from "../middleware/upload";
const router = Router();

// Get all blogs
router.get("/", getAllBlogs);

// Get blog by ID
router.get("/:id", getBlogById);

// Create a new blog
router.post("/", upload.any(), postBlog);

// Save a blog
router.post("/:id/save", saveBlog);
router.delete("/:id/unsave", unsaveBlog);

// Update a blog
router.patch("/:id", upload.any(), updateBlog);

// Delete a blog
router.delete("/:id", deleteBlog);

export default router;
