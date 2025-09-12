import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types/request.js";
import * as exerciseService from "@/app/komplex/services/me/exercises/service.js";
import * as exerciseByIdService from "@/app/komplex/services/me/exercises/[id]/service.js";

// export const getExercisesController = async (
//   req: AuthenticatedRequest,
//   res: Response
// ) => {
//   try {
//     const { userId } = req.user;
//     const result = await exerciseService.getExercises(Number(userId));
//     return res.status(200).json(result.data);
//   } catch (error: any) {
//     console.error("Get exercises error:", error);
//     return res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

export const getExerciseHistoryController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user;
    const result = await exerciseService.getExerciseHistory(Number(userId));
    return res.status(200).json(result.data);
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

export const getExerciseDashboardController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req.user;
    const result = await exerciseService.getExerciseDashboard(Number(userId));
    return res.status(200).json(result.data);
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

export const getExerciseByIdController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const result = await exerciseByIdService.getExerciseById(
      id,
      Number(userId)
    );
    return res.status(200).json(result.data);
  } catch (error) {
    if ((error as Error).message === "History not found") {
      return res.status(404).json({ message: "History not found" });
    }
    return res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};

export const submitExerciseController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { answers, score, timeTaken } = req.body;
    const result = await exerciseByIdService.submitExercise(
      id,
      answers,
      score,
      timeTaken,
      Number(userId)
    );
    return res.status(200).json(result.data);
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: (error as Error).message,
    });
  }
};
