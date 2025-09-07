import { Router } from "express";
import { getAllCommentsForAForumController } from "../../controllers/feed/forum-comments.controller.js";

const router = Router();

router.get("/:id", getAllCommentsForAForumController as any);

export default router;