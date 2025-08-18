import { Router } from "express";
import upload from "../../middleware/upload";
import {
	deleteForum,
	getAllForums,
	getForumById,
	likeForum,
	postForum,
	unlikeForum,
	updateForum,
} from "../controllers/forums.controller";
const router = Router();

// Add your route handlers here
router.post("/", upload.any(), postForum);
router.get("/", getAllForums);
router.get("/:id", getForumById);
router.patch("/:id", upload.any(), updateForum);
router.delete("/:id", deleteForum);
router.post("/:id/like", likeForum);
router.delete("/:id/unlike", unlikeForum);

export default router;
