import { AuthenticatedRequest } from "../../../types/request";
import { Response } from "express";
import { db } from "../../../db";
import { users } from "../../../db/schema";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";

export const handleLogin = async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string);
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    maxAge: 1000 * 60 * 60, // 1 hour
    sameSite: "strict",
  });
  res.status(200).json({ message: "Login successful", user, token });
};