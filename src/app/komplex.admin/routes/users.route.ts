import { Router } from "express";
import {
  createAdmin,
  getAllAdmins,
  getAllUsers,
  updateAdmin,
  deleteAdmin,
} from "../controllers/users.controller";
const router = Router();

// Add your route handlers here
router.get("/", getAllUsers);
router.get("/admins", getAllAdmins);
router.post("/admins", createAdmin);
router.put("/admins/:id", updateAdmin);
router.delete("/admins/:id", deleteAdmin);

export default router;
