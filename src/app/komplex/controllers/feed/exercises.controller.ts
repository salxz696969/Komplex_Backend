import { Request, Response } from "express";
import * as exerciseService from "@/app/komplex/services/feed/exercises/service.js";
import { AuthenticatedRequest } from "@/types/request.js";

export const getExercisesController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { grade } = req.query;
    const userId = 1; // TO CHANGE
    const result = await exerciseService.getExercises(grade as string, userId);
    return res.status(200).json(result.data);
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

export const getExerciseController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const result = await exerciseService.getExercise(id);
    return res.status(200).json(result.data);
  } catch (error) {
    if ((error as Error).message === "Exercise not found") {
      return res.status(404).json({ message: "Exercise not found" });
    }
    return res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};
