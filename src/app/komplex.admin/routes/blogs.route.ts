import { Router } from "express";
import { postBlog, getAllBlogs, getSavedBlogs } from "../controllers/blogs.controller";
const router = Router();

// Add your route handlers here
router.get("/", getAllBlogs);
router.post("/", postBlog);
router.get("/:id/saved", getSavedBlogs);

export default router;
