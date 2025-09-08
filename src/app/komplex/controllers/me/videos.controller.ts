import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as videoService from "@/app/komplex/services/me/videos/service.js";
import * as videoByIdService from "@/app/komplex/services/me/videos/[id]/service.js";

export const getAllMyVideosController = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const userId = req.user.userId;
		const result = await videoService.getAllMyVideos(req.query, Number(userId));
		return res.status(200).json(result);
	} catch (error) {
		return res.status(500).json({ success: false, error: (error as Error).message });
	}
};

export const likeVideoController = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const userId = req.user.userId;
		const result = await videoByIdService.likeVideo(Number(id), Number(userId));
		return res.status(200).json(result);
	} catch (error) {
		if ((error as Error).message === "Unauthorized") {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const unlikeVideoController = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const userId = req.user.userId;
		const result = await videoByIdService.unlikeVideo(Number(id), Number(userId));
		return res.status(200).json(result);
	} catch (error) {
		if ((error as Error).message === "Unauthorized") {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const saveVideoController = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const userId = req.user.userId;
		const result = await videoByIdService.saveVideo(Number(id), Number(userId));
		return res.status(200).json(result);
	} catch (error) {
		if ((error as Error).message === "Unauthorized") {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const unsaveVideoController = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { id } = req.params;
		const userId = req.user.userId;
		const result = await videoByIdService.unsaveVideo(Number(id), Number(userId));
		return res.status(200).json(result);
	} catch (error) {
		if ((error as Error).message === "Unauthorized") {
			return res.status(401).json({ success: false, message: "Unauthorized" });
		}
		if ((error as Error).message === "Video not found") {
			return res.status(404).json({ success: false, message: "Video not found" });
		}
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const updateVideoController = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const userId = req.user.userId;
		const { id } = req.params;

		if (!id || !req.body.title || !req.body.description) {
			return res.status(400).json({ success: false, message: "Missing required fields" });
		}

		const { title, description, videoKey, thumbnailKey, questions } = req.body;

		const result = await videoByIdService.updateVideo(Number(id), Number(userId), {
			title,
			description,
			videoKey,
			thumbnailKey,
			questions,
		});
		return res.status(200).json(result);
	} catch (error) {
		if ((error as Error).message === "Video not found") {
			return res.status(404).json({ success: false, message: "Video not found" });
		}
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const deleteVideoController = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const userId = req.user.userId;
		const { id } = req.params;
		const result = await videoByIdService.deleteVideo(Number(id), Number(userId));
		return res.status(200).json(result.data);
	} catch (error) {
		if ((error as Error).message === "Video not found or unauthorized") {
			return res.status(404).json({ success: false, message: "Video not found or unauthorized" });
		}
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const getMyVideoHistoryController = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const userId = req.user.userId;
		const result = await videoService.getMyVideoHistory(Number(userId));
		return res.status(200).json(result);
	} catch (error) {
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};

export const postVideoController = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const userId = req.user.userId;
		const result = await videoService.postVideo(req.body, Number(userId));
		return res.status(201).json(result);
	} catch (error) {
		if ((error as Error).message.includes("User with ID")) {
			return res.status(400).json({
				success: false,
				error: (error as Error).message,
			});
		}
		return res.status(500).json({
			success: false,
			error: (error as Error).message,
		});
	}
};
