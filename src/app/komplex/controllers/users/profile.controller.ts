import { Response } from "express";
import { getUserProfile } from "@/app/komplex/services/users/profile/service.js";
import { AuthenticatedRequest } from "@/types/request.js";

export const getUserProfileController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }
    const userProfile = await getUserProfile(Number(id));
    res.status(200).json(userProfile);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};
