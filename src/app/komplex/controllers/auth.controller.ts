import { AuthenticatedRequest } from "../../../types/request";
import { sign } from "jsonwebtoken";
import { Response } from "express";

export const handleOAuthSuccess = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const user = req.user;
  const token = sign({ id: user?.userId }, process.env.JWT_SECRET as string);

  res
    .cookie("token", token, { httpOnly: true })
    .status(200)
    .json({ message: "Login successful", user, token });
};
