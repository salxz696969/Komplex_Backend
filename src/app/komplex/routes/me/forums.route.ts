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

const router = Router();

router.get("/", getAllMyForumsController); // GET /me/forums - my forums
router.post("/", uploadImages.array("images", 4), postForumController); // POST /me/forums - create forum
router.put("/:id", uploadImages.array("images", 4), updateForumController); // PUT /me/forums/:id - update forum
router.delete("/:id", deleteForumController); // DELETE /me/forums/:id - delete forum
router.patch("/:id/like", likeForumController); // PATCH /me/forums/:id/like - like forum
router.patch("/:id/unlike", unlikeForumController); // PATCH /me/forums/:id/unlike - unlike forum

// TODO: Future features
// router.get("/liked", getLikedForums); // GET /me/liked-forums - forums I liked
// router.get("/saved", getSavedForums); // GET /me/saved-forums - forums I saved

export default router;
