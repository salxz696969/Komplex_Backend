// src/middleware/upload.ts
import multer from "multer";

// store files in memory buffer
const storage = multer.memoryStorage();
const upload = multer({ storage });

export default upload;