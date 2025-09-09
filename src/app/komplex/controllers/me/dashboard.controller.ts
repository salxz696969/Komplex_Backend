import { Request, Response } from "express";
import * as dashboardService from "@/app/komplex/services/me/dashboard/service.js";
import { AuthenticatedRequest } from "@/types/request.js";

export const getUserContentDashboardController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user.userId;
    const result = await dashboardService.getUserContentDashboard(userId);
    return res.status(200).json(result.data);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: (error as Error).message });
  }
};
