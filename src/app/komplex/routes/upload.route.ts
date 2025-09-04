import { Router } from "express";
import { getSignedUrl } from "../controllers/upload.controller.js";

const router = Router();

router.post("/upload-url", getSignedUrl as any);

export default router;
