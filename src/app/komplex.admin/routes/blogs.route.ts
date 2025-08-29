import { Router } from "express";
import { postBlog, getAllBlogs } from "../controllers/blogs.controller.js";
const router = Router();

// Add your route handlers here
router.get("/", getAllBlogs);
router.post("/", postBlog);

export default router;
