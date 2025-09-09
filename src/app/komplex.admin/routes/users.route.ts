import { Router } from "express";
import { createAdmin, getAllAdmins, getAllUsers, updateAdmin, deleteAdmin } from "../controllers/users.controller.js";
import {
	adminGetSmallContentRateLimiter,
	adminSmallDeleteRateLimiter,
	adminSmallPostRateLimiter,
	adminSmallUpdateRateLimiter,
} from "@/middleware/redisLimiter.js";
const router = Router();

// Add your route handlers here
router.get("/", getAllUsers);

router.get("/admins", adminGetSmallContentRateLimiter, getAllAdmins);
router.post("/admins", adminSmallPostRateLimiter, createAdmin);
router.put("/admins/:id", adminSmallUpdateRateLimiter, updateAdmin);
router.delete("/admins/:id", adminSmallDeleteRateLimiter, deleteAdmin);

export default router;
