import { Router } from "express";
import { postBlog, getAllBlogs, getSavedBlogs } from "../controllers/blogs.controller";
const router = Router();

// Add your route handlers here
router.get("/", getAllBlogs as any);
router.post("/", postBlog as any);
router.get("/:id/saved", getSavedBlogs as any);

export default router;
