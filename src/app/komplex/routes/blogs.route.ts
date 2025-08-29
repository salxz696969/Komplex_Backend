import { Router } from "express";
import {
	postBlog,
	getAllBlogs,
	getBlogById,
	saveBlog,
	updateBlog,
	deleteBlog,
	unsaveBlog,
} from "../controllers/blogs.controller.js";
import { uploadImages } from "../../middleware/upload.js";

const router = Router();

// Get all blogs
router.get("/", getAllBlogs);

// Get blog by ID
router.get("/:id", getBlogById);

// Create a new blog
router.post("/", uploadImages.array("images", 4), postBlog);

// Save a blog
router.post("/:id/save", saveBlog);
router.delete("/:id/unsave", unsaveBlog);

// Update a blog
router.patch("/:id", uploadImages.array("images", 4), updateBlog);

// Delete a blog
router.delete("/:id", deleteBlog);

export default router;
