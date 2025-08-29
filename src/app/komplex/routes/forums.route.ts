import { Router } from "express";
import { uploadImages } from "../../middleware/upload.js";
import {
	deleteForum,
	getAllForums,
	getForumById,
	likeForum,
	postForum,
	unlikeForum,
	updateForum,
} from "../controllers/forums.controller.js";
const router = Router();

// Add your route handlers here
router.post("/", uploadImages.array("images", 4), postForum);
router.get("/", getAllForums);
router.get("/:id", getForumById);
router.patch("/:id", uploadImages.array("images", 4), updateForum);
router.delete("/:id", deleteForum);
router.post("/:id/like", likeForum);
router.delete("/:id/unlike", unlikeForum);

export default router;
