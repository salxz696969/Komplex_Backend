import { Router } from "express";
import { getAllAdmins, getAllUsers } from "../controllers/users.controller";
const router = Router();

// Add your route handlers here
router.get("/", getAllUsers);
router.get("/admins", getAllAdmins);

export default router;
