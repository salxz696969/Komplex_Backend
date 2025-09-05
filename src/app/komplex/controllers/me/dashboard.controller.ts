import { Request, Response } from "express";
import * as dashboardService from "@/app/komplex/services/me/dashboard/service.js";

export const getUserContentDashboardController = async (
  req: Request,
  res: Response
) => {
  try {
    let userId = 1; // assume for now // TODO
    const result = await dashboardService.getUserContentDashboard(userId);
    return res.status(200).json(result.data);
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: (error as Error).message });
  }
};
