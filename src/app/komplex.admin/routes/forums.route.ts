import { Router } from "express";
import {
  getAllForums,
  getForumById,
  updateForum,
  deleteForum,
} from "../controllers/forums.controller.js";
const router = Router();

// Add your route handlers here
router.get("/", getAllForums);
router.get("/:id", getForumById);
router.put("/:id", updateForum);
router.delete("/:id", deleteForum);

export default router;
