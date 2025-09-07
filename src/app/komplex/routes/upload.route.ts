import { Router } from "express";
import { getSignedUrl } from "../controllers/upload.controller.js";
import { verifyFirebaseToken } from "@/middleware/auth.js";

const router = Router();

router.post("/upload-url", verifyFirebaseToken as any, getSignedUrl as any);

export default router;
