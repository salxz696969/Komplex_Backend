import { Router } from "express";
import { followUser, unfollowUser } from "../controllers/users.controller.js";
const router = Router();

// Add your route handlers here
router.post("/:id", followUser);
router.delete("/:id", unfollowUser);

export default router;
