import { Router } from "express";
import { getUserForumsController } from "@/app/komplex/controllers/users/forums.controller.js";

const router = Router();

router.get("/", getUserForumsController as any);

export default router;
