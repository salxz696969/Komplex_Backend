import { Router } from "express";
import upload from "../../middleware/upload";
import { getAllForums, getForumById } from "../controllers/forums.controller";
const router = Router();

// Add your route handlers here
router.get("/", getAllForums);
router.get("/:id", getForumById);

export default router;
