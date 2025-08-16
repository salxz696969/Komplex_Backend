import { Router } from "express";
import blogsRouter from "./blogs.route";
import exercisesRouter from "./exercises.route";
import followersRouter from "./followers.route";
import forumsRouter from "./forums.route";
import usersRouter from "./users.route";
import gradesRouter from "./grades.route";
import subjectsRouter from "./subjects.route";
import databaseRouter from "./database.route";
import videosRouter from "./videos.route";
import dashboardRouter from "./dashborad.route";
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
