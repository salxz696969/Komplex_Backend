import { db } from "../../../db";
import { exercises } from "../../../db/schema";

import { Request, Response } from "express";

export const getGrades = async (req: Request, res: Response) => {
  try {
    const result = await db
      .select({
        grade: exercises.grade,
      })
      .from(exercises);
    const grades = [...new Set(result.map((item) => item.grade))];
    res.status(200).json(grades);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" + error });
  }
};
