import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import routes from "./app/komplex/routes/index.js";
import adminRoutes from "./app/komplex.admin/routes/index.js";
import { redis } from "./db/redis/redisConfig.js";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.use("/", routes);
app.use("/admin", adminRoutes);

try {
  await redis.connect();
  console.log("Redis connected");
} catch (err) {
  console.error("Failed to connect to Redis:", err);
}




app.listen(process.env.PORT || 6000, () => {
  console.log(
    `Server is running on http://localhost:${process.env.PORT || 6000}`
  );
});
