import { Request, Response } from "express";
import { deleteFromCloudinary, uploadToCloudinary } from "../../db/cloudinary/cloundinaryFunction";

export const postVideo = async (req: Request, res: Response) => {
	let public_url: string | null = null;
	let mediaType: "video" | null = null;

	try {
		if (req.file) {
			if (!req.file.mimetype.startsWith("video")) {
				throw new Error("Only video files are allowed.");
			}

			const result = await uploadToCloudinary(req.file.buffer, "my_app_uploads", "auto");

			public_url = (result as { secure_url: string }).secure_url;
			mediaType = "video";
		} else {
			throw new Error("No video file uploaded.");
		}
	} catch (error) {
		try {
			if (public_url && mediaType) {
				await deleteFromCloudinary(public_url, mediaType);
			}
		} catch (err) {
			console.error("Failed to delete uploaded media:", err);
		}
		console.error(error);
		return res.status(500).json({ success: false, error: (error as Error).message });
	}
};

export const getAllVideos = async (req: Request, res: Response) => {
	try {
	} catch (error) {}
};

export const getVideoById = async (req: Request, res: Response) => {
	try {
	} catch (error) {}
};

export const likeVideo = async (req: Request, res: Response) => {
	try {
	} catch (error) {}
};

export const unlikeVideo = async (req: Request, res: Response) => {
	try {
	} catch (error) {}
};

export const saveVideo = async (req: Request, res: Response) => {
	try {
	} catch (error) {}
};

export const unsaveVideo = async (req: Request, res: Response) => {
	try {
	} catch (error) {}
};

export const updateVideo = async (req: Request, res: Response) => {
	let public_url: string | null = null;
	let mediaType: "video" | null = null;

	try {
		if (req.file) {
			if (!req.file.mimetype.startsWith("video")) {
				throw new Error("Only video files are allowed.");
			}

			const result = await uploadToCloudinary(req.file.buffer, "my_app_uploads", "auto");

			public_url = (result as { secure_url: string }).secure_url;
			mediaType = "video";
		} else {
			throw new Error("No video file uploaded.");
		}
	} catch (error) {
		try {
			if (public_url && mediaType) {
				await deleteFromCloudinary(public_url, mediaType);
			}
		} catch (err) {
			console.error("Failed to delete uploaded media:", err);
		}
		console.error(error);
		return res.status(500).json({ success: false, error: (error as Error).message });
	}
};

export const deleteVideo = async (req: Request, res: Response) => {
	try {
	} catch (error) {}
};
