import { Request, Response } from "express";

import { db } from "../../../db";
import { users } from "../../../db/schema";
import { eq } from "drizzle-orm";

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.isAdmin, false));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

export const getAllAdmins = async (req: Request, res: Response) => {
  try {
    const result = await db.select().from(users).where(eq(users.isAdmin, true));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch admins" });
  }
};
