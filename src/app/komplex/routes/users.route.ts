import { Router } from "express";
import { followUser, unfollowUser } from "../controllers/users.controller";
import { verifyFirebaseToken } from "../../../middleware/auth";
const router = Router();

// Add your route handlers here
router.post("/:id", followUser as any);
router.delete("/:id", unfollowUser as any);

export default router;
