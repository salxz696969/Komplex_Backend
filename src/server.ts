import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { specs } from "./config/swagger.js";
import { redis } from "./db/redis/redisConfig.js";

import routes from "./app/komplex/routes/index.js";
import adminRoutes from "./app/komplex.admin/routes/index.js";
import { globalRateLimiter } from "./middleware/redisLimiter.js";
dotenv.config();

const app = express();

try {
  await redis.connect();
  console.log("Redis connected:", redis.isOpen);
  const PORT = process.env.PORT || 6000;

  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📁 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? "Set" : "NOT SET"}`);
  });
} catch (err) {
  console.error("Failed to connect to Redis:", err);
}
// middleware

// Enhanced error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error("🚨 Express Error Middleware:");
  console.error("Error:", err);
  console.error("Stack trace:", err.stack);
  console.error("Request URL:", req.url);
  console.error("Request method:", req.method);
  console.error("Request body:", req.body);
  console.error("Request params:", req.params);
  console.error("Request query:", req.query);

  res.status(500).json({
    message: "Internal Server Error",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

app.use(
  cors({
    origin: ["http://localhost:4000", "http://localhost:3000"],
    credentials: true,
  })
);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());

// Swagger documentation
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "KOMPLEX API Documentation",
  })
);

app.use(globalRateLimiter);
app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// app routes

app.use("/api/", routes);
app.use("/api/admin", adminRoutes);

// connection

// Global error handlers for uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("🚨 UNCAUGHT EXCEPTION:", error);
  console.error("Stack trace:", error.stack);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 UNHANDLED REJECTION at:", promise);
  console.error("Reason:", reason);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("🛑 SIGINT received, shutting down gracefully");
  process.exit(0);
});
