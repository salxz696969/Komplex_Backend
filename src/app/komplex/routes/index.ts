import { Router } from "express";
import feedRouter from "./feed/index.js";
import meRouter from "./me/index.js";
import usersRouter from "./users/index.js";
import authRouter from "./auth.routes.js";
import uploadRouter from "./upload.route.js";

const router = Router();

router.get("/", async (req, res) => {
  res.status(200).json({ message: "Welcome to the KOMPLEX API" });
});

router.use("/feed", feedRouter); // Public content discovery
router.use("/me", meRouter); // My content and interactions
router.use("/users", usersRouter); // Other users' content

// Core functionality
router.use("/auth", authRouter);
router.use("/upload", uploadRouter);


export default router;
