import { AuthenticatedRequest } from "@/types/request.js";
import { Request, Response } from "express";
import { searchForumsService } from "../../services/search/forums/service.js";

export const forumSearchController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId= req.user.userId;
        const { query, limit = "10", offset = "0" } = req.query;
        if(!query || query.trim() === "") {
            return res.status(400).json({ success: false, message: "Query parameter is required" });
        }
        const result = await searchForumsService(query as string, Number(limit), Number(offset), Number(userId));
        return res.status(200).json({ result });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
}