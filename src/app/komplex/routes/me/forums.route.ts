import { Router } from "express";
import { uploadImages } from "../../../../middleware/upload.js";
import {
  getAllMyForumsController,
  postForumController,
  updateForumController,
  deleteForumController,
  likeForumController,
  unlikeForumController,
  // TODO: Future features
  // getLikedForums, // GET /me/liked-forums - forums I liked
  // getSavedForums, // GET /me/saved-forums - forums I saved
} from "../../controllers/me/forums.controller.js";
import { verifyFirebaseToken } from "@/middleware/auth.js";

const router = Router();

router.get("/", verifyFirebaseToken as any, getAllMyForumsController as any); // GET /me/forums - my forums
router.post(
  "/",
  verifyFirebaseToken as any,
  uploadImages.array("images", 4),
  postForumController as any
); // POST /me/forums - create forum
router.put(
  "/:id",
  uploadImages.array("images", 4),
  verifyFirebaseToken as any,
  updateForumController as any
); // PUT /me/forums/:id - update forum
router.delete("/:id", verifyFirebaseToken as any, deleteForumController as any); // DELETE /me/forums/:id - delete forum
router.patch(
  "/:id/like",
  verifyFirebaseToken as any,
  likeForumController as any
); // PATCH /me/forums/:id/like - like forum
router.patch(
  "/:id/unlike",
  verifyFirebaseToken as any,
  unlikeForumController as any
); // PATCH /me/forums/:id/unlike - unlike forum

// TODO: Future features
// router.get("/liked", getLikedForums); // GET /me/liked-forums - forums I liked
// router.get("/saved", getSavedForums); // GET /me/saved-forums - forums I saved

export default router;
