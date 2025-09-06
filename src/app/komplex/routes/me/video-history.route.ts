import { Router } from "express";
import { getMyVideoHistoryController } from "../../controllers/me/videos.controller.js";

const router = Router();

router.get("/", getMyVideoHistoryController); // GET /me/videos/history - my video history

export default router;