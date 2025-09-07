import { Request, Response } from "express";
import { getUserProfile } from "@/app/komplex/services/users/profile/service.js";

export const getUserProfileController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userProfile = await getUserProfile(Number(id));
    res.status(200).json(userProfile);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};
