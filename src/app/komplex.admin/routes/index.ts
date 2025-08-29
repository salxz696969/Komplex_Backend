import { Router } from "express";
import blogsRouter from "./blogs.route.js";
import exercisesRouter from "./exercises.route.js";
import followersRouter from "./followers.route.js";
import forumsRouter from "./forums.route.js";
import usersRouter from "./users.route.js";
import gradesRouter from "./grades.route.js";
import subjectsRouter from "./subjects.route.js";
import databaseRouter from "./database.route.js";
import videosRouter from "./videos.route.js";
import dashboardRouter from "./dashborad.route.js";
const adminRoutes = Router();
// should have /database but let it be like this for now
adminRoutes.use("/database", databaseRouter);
adminRoutes.use("/blogs", blogsRouter);
adminRoutes.use("/exercises", exercisesRouter);
adminRoutes.use("/grades", gradesRouter);
adminRoutes.use("/subjects", subjectsRouter);
adminRoutes.use("/followers", followersRouter);
adminRoutes.use("/forums", forumsRouter);
adminRoutes.use("/users", usersRouter);
adminRoutes.use("/videos", videosRouter);
adminRoutes.use("/dashboard", dashboardRouter);

export default adminRoutes;
