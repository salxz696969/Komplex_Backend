import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import routes from "./app/komplex/routes/index";
import adminRoutes from "./app/komplex.admin/routes";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.use("/", routes);
app.use("/admin", adminRoutes);

app.listen(process.env.PORT || 6000, () => {
  console.log(
    `Server is running on http://localhost:${process.env.PORT || 6000}`
  );
});
