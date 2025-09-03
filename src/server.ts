import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import routes from "./app/komplex/routes/index";
import adminRoutes from "./app/komplex.admin/routes/index";
import passport from "./config/passport/google";
import session from "express-session";
import cookieParser from "cookie-parser";

dotenv.config();

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

const app = express();

app.use(
  session({
    secret: process.env.JWT_SECRET!,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(cors(
  {
    origin: "http://localhost:4000",
    credentials: true,
  }
));
app.use(express.json());
app.use(cookieParser());

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

app.use("/", routes);
app.use("/admin", adminRoutes);

const PORT = process.env.PORT || 6000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? "Set" : "NOT SET"}`);
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
