import multer from "multer";
import { Request, Response, NextFunction } from "express";

// Configure multer for memory storage
const storage = multer.memoryStorage();

// Create multer instance
export const uploadImages = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 4, // Maximum 4 files
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

// Error handling middleware for multer
export const handleUploadError = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ message: "File too large. Maximum size is 10MB." });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res
        .status(400)
        .json({ message: "Too many files. Maximum is 4 files." });
    }
  }
  if (err.message === "Only image files are allowed!") {
    return res.status(400).json({ message: "Only image files are allowed!" });
  }
  next(err);
};
