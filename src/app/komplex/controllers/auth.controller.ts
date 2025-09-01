import { AuthenticatedRequest } from "../../../types/request";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import { db } from "../../../db";
import { users } from "../../../db/schema";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcrypt";

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
  const { email, username, password } = req.body;

  // First find user by email only
  const [user] = await db
    .select()
    .from(users)
    .where(or(eq(users.email, email), eq(users.username, username)))
    .limit(1);

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // Then verify password
  const isValidPassword = await bcrypt.compare(
    password,
    user.password as string
  );
  if (!isValidPassword) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string);

  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    maxAge: 1000 * 60 * 5, // 5 minutes
    sameSite: "strict",
  });

  res.status(200).json({ message: "Login successful", user: user, token });
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
    // Hash password properly with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    const [user] = await db
      .insert(users)
      .values({
        email,
        username,
        firstName,
        password: hashedPassword,
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

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      maxAge: 1000 * 60 * 5, // 5 minutes
      sameSite: "strict",
    });

    res.status(200).json({ message: "Signup successful", user, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getToken = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "No token found" });
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
    };

    // Return the token for mobile usage
    res.status(200).json({ token });
  } catch (error) {
    console.error("Token validation error:", error);
    res.status(401).json({ message: "Invalid token" });
  }
};

export const extendCookieTime = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "No token found" });
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
    };

    // Extend cookie for web usage
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      sameSite: "strict",
    });

    res.status(200).json({ message: "Cookie extended" });
  } catch (error) {
    console.error("Token validation error:", error);
    res.status(401).json({ message: "Invalid token" });
  }
};
