// src/middleware/upload.ts
import multer from "multer";
import path from "path";

// -----------------------
// Memory storage for photos
// -----------------------
const photoStorage = multer.memoryStorage();

// Only photos
const photoFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
	if (file.mimetype.startsWith("image/")) {
		cb(null, true);
	} else {
		cb(new Error("Only image files are allowed"));
	}
};

export const uploadImages = multer({ storage: photoStorage, fileFilter: photoFilter });

// -----------------------
// Disk storage for videos
// -----------------------
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		if (file.fieldname === "video") {
			cb(null, "src/app/middleware/uploads/videos/");
		} else if (file.fieldname === "image") {
			cb(null, "src/app/middleware/uploads/images");
		} else {
			cb(new Error("Invalid field name"), "");
		}
	},
	filename: (req, file, cb) => {
		const ext = path.extname(file.originalname);
		const filename = `${Date.now()}-${file.fieldname}${ext}`;
		cb(null, filename);
	},
});

export const uploadVideoAndThumbnail = multer({
	storage,
	limits: {
		fileSize: 1024 * 1024 * 200, // 500MB
	},
}).fields([
	{ name: "video", maxCount: 1 },
	{ name: "image", maxCount: 1 },
]);
