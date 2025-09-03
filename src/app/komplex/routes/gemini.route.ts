import { Router } from "express";
import { callGemini } from "../controllers/gemini.controller.js";

const router = Router();

router.post("/", callGemini);
router.get("/", (req, res) => {
    res.send("Gemini route is working");
});

export default router;
