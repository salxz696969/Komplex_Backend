import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/request.js";
import admin from "../config/firebase/admin.js";

export const verifyFirebaseToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // verify and attach user to request
  // return res.status(200).json(req.headers.authorization);
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = { userId: decoded.uid };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token", error });
  }
};
