import { Router } from "express";
import { getUserContentDashboard } from "../controller/user-content-dashboard.controller";
import { getAllUserBlogs } from "../controller/user-content-blogs.controller";
const router = Router();

router.get("/dashboard", getUserContentDashboard);
router.get("/blogs", getAllUserBlogs);

export default router;