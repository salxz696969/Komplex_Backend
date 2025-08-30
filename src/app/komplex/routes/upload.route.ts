import { Router } from "express";
import { getSignedUrl } from "../controllers/upload.controller";

const router = Router();

router.post("/upload-url", getSignedUrl);

export default router;
