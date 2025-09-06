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

router.get("/", getAllMyBlogsController);
router.post("/", uploadImages.array("images", 4), postBlogController);
router.put("/:id", uploadImages.array("images", 4), updateBlogController);
router.delete("/:id", deleteBlogController);
router.patch("/:id/save", saveBlogController);
router.patch("/:id/unsave", unsaveBlogController);

// TODO: Future features
// router.get("/liked", getLikedBlogs); // GET /me/liked-blogs - blogs I liked
// router.get("/saved", getSavedBlogs); // GET /me/saved-blogs - blogs I saved

export default router;
