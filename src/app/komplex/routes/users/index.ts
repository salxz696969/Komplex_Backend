import { Router } from "express";
import { getUserBlogsController } from "@/app/komplex/controllers/users/blogs.controller.js";
import { getUserForumsController } from "@/app/komplex/controllers/users/forums.controller.js";
import { getUserVideosController } from "@/app/komplex/controllers/users/videos.controller.js";
import { getUserProfileController } from "@/app/komplex/controllers/users/profile.controller.js";

const router = Router();

// ! Using controller functions at index here because for some reason sub router does not work

// Other users' content (read-only)
router.get("/:id/blogs", getUserBlogsController as any);
router.get("/:id/forums", getUserForumsController as any);
router.get("/:id/videos", getUserVideosController as any);
router.get("/:id/profile", getUserProfileController as any);

export default router;
