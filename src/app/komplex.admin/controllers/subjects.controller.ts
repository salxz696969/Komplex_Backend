import { db } from "../../../db";
import { exercises } from "../../../db/schema";

import { Request, Response } from "express";

export const getSubjects = async (req: Request, res: Response) => {
  try {
    const result = await db
      .select({
        subject: exercises.subject,
      })
      .from(exercises);
    const subjects = [...new Set(result.map((item) => item.subject))];
    res.status(200).json(subjects);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" + error });
  }
};
