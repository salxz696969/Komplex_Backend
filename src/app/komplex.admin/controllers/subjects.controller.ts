import { db } from "../../../db/index.js";
import { exercises } from "../../../db/schema.js";

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
