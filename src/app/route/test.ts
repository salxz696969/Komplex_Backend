import { Router } from "express";
import upload from "../middleware/upload";
import cloudinary from "../../db/cloudinary/cloudinaryConfig";
const router = Router();

// Add your route handlers here
router.post("/upload", upload.single("file"), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ success: false, message: "No file uploaded" });
		}

		// Upload buffer to Cloudinary
		const stream = cloudinary.uploader.upload_stream(
			{ folder: "my_app_uploads", resource_type: "auto" }, // auto handles images & videos
			(error, result) => {
				if (error) {
					console.error(error);
					return res.status(500).json({ success: false, error: error.message });
				}
				if (result) {
					// send back the Cloudinary URL
					return res.json({ success: true, url: result.secure_url });
				}
			}
		);

		stream.end(req.file.buffer);
	} catch (err) {
		res.status(500).json({ success: false, error: (err as Error).message });
	}
});

router.delete("/delete", async (req, res) => {
	try {
		const { public_id } = req.body;

		if (!public_id) {
			return res.status(400).json({ success: false, message: "public_id is required" });
		}

		// Delete from Cloudinary
		const result = await cloudinary.uploader.destroy(public_id, { resource_type: "image" });

		res.json({ success: true, result });
	} catch (err) {
		res.status(500).json({ success: false, error: (err as Error).message });
	}
});

export default router;
