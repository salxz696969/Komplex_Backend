import { AuthenticatedRequest } from "../../../types/request";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import { db } from "../../../db";
import { users } from "../../../db/schema";
import { and, eq } from "drizzle-orm";
import bcrypt from "crypto";

export const handleOAuthSuccess = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const user = req.user;
  const token = jwt.sign(
    { id: user?.userId },
    process.env.JWT_SECRET as string
  );
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    maxAge: 1000 * 60 * 5, // 5 minutes
    sameSite: "strict",
  });
  res.status(200).json({ message: "Login successful", user, token });
};

export const handleLogin = async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;
  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.password, password)))
    .limit(1);

  if (!user[0]) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user[0].id }, process.env.JWT_SECRET as string);

  res.status(200).json({ message: "Login successful", user: user[0], token });
};

export const handleSignup = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const {
    email,
    password,
    username,
    firstName,
    lastName,
    dateOfBirth,
    isAdmin,
    isVerified,
    phone,
    profileImage,
  } = req.body;
  try {
    const [user] = await db
      .insert(users)
      .values({
        email,
        username,
        firstName,
        password: bcrypt.hash(password, "sha256"),
        lastName,
        dateOfBirth,
        isAdmin,
        isVerified,
        phone,
        profileImage,
      })
      .returning();

    if (!user) {
      return res.status(401).json({ message: "Signup failed" });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string);

    res.status(200).json({ message: "Signup successful", user, token });
  } catch (error) {
    console.error(error);
  }
};

export const getToken = async (req: AuthenticatedRequest) => {
  // get from cookie, convert to jwt
  const token = req.cookies.token;
  if (!token) {
    return null;
  }
  return token;
};
