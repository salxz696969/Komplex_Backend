import { AuthenticatedRequest } from "../../../types/request";
import jwt from "jsonwebtoken";
import { Response } from "express";

export const handleOAuthSuccess = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const user = req.user;
  const token = jwt.sign(
    { id: user?.userId },
    process.env.JWT_SECRET as string
  );

  res.status(200).json({ message: "Login successful", user, token });
};
