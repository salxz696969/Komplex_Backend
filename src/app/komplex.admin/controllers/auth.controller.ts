import { AuthenticatedRequest } from "../../../types/request";
import { Response } from "express";
import { db } from "../../../db";
import { users } from "../../../db/schema";
import { and, eq } from "drizzle-orm";

export const handleLogin = async (req: AuthenticatedRequest, res: Response) => {
  const { uid } = req.body;
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.uid, uid), eq(users.isAdmin, true)));
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  res.status(200).json(user);
};
