import { Router } from "express";
import { getAllCommentsForAForumController } from "../../controllers/feed/forum-comments.controller.js";

const router = Router();

router.get("/:id", getAllCommentsForAForumController);

export default router;