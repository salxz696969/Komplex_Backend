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
import { verifyFirebaseToken } from "@/middleware/auth.js";

const router = Router();

router.get("/", verifyFirebaseToken as any, getAllMyBlogsController as any);
router.post(
  "/",
  verifyFirebaseToken as any,
  uploadImages.array("images", 4),
  postBlogController as any
);
router.put(
  "/:id",
  verifyFirebaseToken as any,
  uploadImages.array("images", 4),
  updateBlogController as any
);
router.delete("/:id", verifyFirebaseToken as any, deleteBlogController as any);
router.patch(
  "/:id/save",
  verifyFirebaseToken as any,
  saveBlogController as any
);
router.patch(
  "/:id/unsave",
  verifyFirebaseToken as any,
  unsaveBlogController as any
);

// TODO: Future features
// router.get("/liked", getLikedBlogs); // GET /me/liked-blogs - blogs I liked
// router.get("/saved", getSavedBlogs); // GET /me/saved-blogs - blogs I saved

export default router;
