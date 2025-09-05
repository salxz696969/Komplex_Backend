import { Request, Response } from "express";
import * as exerciseService from "@/app/komplex/services/me/exercises/service.js";

export const getExercisesController = async (req: Request, res: Response) => {
  try {
    const userId = 1; // TO CHANGE
    const result = await exerciseService.getExercises(userId);
    return res.status(200).json(result.data);
  } catch (error: any) {
    console.error("Get exercises error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
