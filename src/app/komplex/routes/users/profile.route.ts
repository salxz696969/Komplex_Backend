import { Router } from "express";
import { getUserProfileController } from "@/app/komplex/controllers/users/profile.controller.js";

const router = Router();

router.get("/", getUserProfileController as any);

export default router;
