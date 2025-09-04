import { Router } from "express";
import { uploadImages } from "../../../middleware/upload.js";
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
router.post("/", uploadImages.array("images", 4), postForum as any);
router.get("/", getAllForums as any);
router.get("/:id", getForumById as any);
router.patch("/:id", uploadImages.array("images", 4), updateForum as any);
router.delete("/:id", deleteForum as any);
router.post("/:id/like", likeForum as any);
router.delete("/:id/unlike", unlikeForum as any);

export default router;
