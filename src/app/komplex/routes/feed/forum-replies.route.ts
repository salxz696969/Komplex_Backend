import { Router } from "express";
import { getForumCommentsRepliesController } from "../../controllers/feed/forum-replies.controller.js";

const router = Router();

router.get("/:id", getForumCommentsRepliesController as any);

export default router;
