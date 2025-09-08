import { Router } from "express";
import { getUserBlogsController } from "@/app/komplex/controllers/users/blogs.controller.js";
import { verifyFirebaseToken } from "@/middleware/auth.js";

const router = Router();

router.get("/",  getUserBlogsController as any);

export default router;
