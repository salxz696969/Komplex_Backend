import { Router } from "express";
import { uploadImages } from "@/middleware/upload.js";
import {
  getAllMyBlogsController,
  postBlogController,
  updateBlogController,
  deleteBlogController,
  saveBlogController,
  unsaveBlogController,
  // TODO: Future features
  // getLikedBlogs, // GET /me/liked-blogs - blogs I liked
  // getSavedBlogs, // GET /me/saved-blogs - blogs I saved
} from "@/app/komplex/controllers/me/blogs.controller.js";

const router = Router();

router.get("/", getAllMyBlogsController as any);
router.post("/", uploadImages.array("images", 4), postBlogController as any);
router.put(
  "/:id",
  uploadImages.array("images", 4),
  updateBlogController as any
);
router.delete("/:id", deleteBlogController as any);
router.patch("/:id/save", saveBlogController as any);
router.patch("/:id/unsave", unsaveBlogController as any);

// TODO: Future features
// router.get("/liked", getLikedBlogs); // GET /me/liked-blogs - blogs I liked
// router.get("/saved", getSavedBlogs); // GET /me/saved-blogs - blogs I saved

export default router;
