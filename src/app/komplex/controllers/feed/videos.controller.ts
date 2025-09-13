import { Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as videoService from "@/app/komplex/services/feed/videos/service.js";
import * as videoByIdService from "@/app/komplex/services/feed/videos/[id]/service.js";

export const getAllVideosController = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user;
		const { type, topic, page } = req.query;
		const result = await videoService.getAllVideos(type as string, topic as string, page as string, Number(userId));
		return res.status(200).json(result);
	} catch (error) {
		return res.status(500).json({ success: false, error: (error as Error).message });
	}
};

export const getVideoByIdController = async (req: AuthenticatedRequest, res: Response) => {
	try {
		const { userId } = req.user;
		const videoId = Number(req.params.id);
		const result = await videoByIdService.getVideoById(videoId, Number(userId));
		return res.status(200).json(result);
	} catch (error) {
		if ((error as Error).message === "Missing video id") {
			return res.status(400).json({ success: false, message: "Missing video id" });
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

export const getRecommendedVideosController = async (
	req: AuthenticatedRequest,
	res: Response
) => {
	try {
		const { userId } = req.user;
		const { limit, offset } = req.query;
		const {id}= req.params;
		const result = await videoByIdService.getRecommendedVideos(Number(userId),Number(id), limit, offset);
		return res.status(200).json(result);
	} catch (error) {
		return res.status(500).json({ success: false, error: (error as Error).message });
	}
};