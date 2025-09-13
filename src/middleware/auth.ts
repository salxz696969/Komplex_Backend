import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/request.js";
import admin from "../config/firebase/admin.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";

export const verifyFirebaseToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);

    // exchange uid for user id
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.uid, decoded.uid));

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = { userId: user.id };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token", error });
  }
};

// middleware
export const verifyFirebaseTokenOptional = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    req.user = { userId: 0 };
    return next();
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token as string);

    // exchange uid for user id
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.uid, decoded.uid));

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = { userId: user.id };
    next();
  } catch {
    req.user = { userId: 0 };
    next();
  }
};
