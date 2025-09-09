import { AuthenticatedRequest } from "../../../types/request.js";
import { Response } from "express";
import { db } from "../../../db/index.js";
import { users } from "../../../db/schema.js";
import { eq } from "drizzle-orm";
import { userOauth } from "../../../db/models/user_oauth.js";
import { redis } from "../../../db/redis/redisConfig.js";

export const handleSignup = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const {
    email,
    username,
    uid,
    firstName,
    lastName,
    dateOfBirth,
    phone,
    profileImageKey,
  } = req.body;
  if (!email || !username) {
    return res.status(400).json({ message: "Missing email or username" });
  }
  try {
    const profileImage = `${process.env.R2_PHOTO_PUBLIC_URL}/${profileImageKey}`;
    const user = await db
      .insert(users)
      .values({
        email,
        username,
        uid,
        firstName,
        lastName,
        dateOfBirth,
        isAdmin: false,
        isSocial: false,
        isVerified: false,
        phone,
        profileImage,
        profileImageKey,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return res.status(200).json(user[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error", error });
  }
};

export const handleSocialLogIn = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const {
      email,
      username,
      provider,
      uid,
      firstName,
      lastName,
      dateOfBirth,
      phone,
      profileImage,
      profileImageKey = null, // set to null
    } = req.body;
    if (!email || !username || !uid) {
      return res.status(400).json({ message: "Missing email or username" });
    }
    const isUserExists = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid));
    if (isUserExists.length > 0) {
      return res.status(200).json(isUserExists[0]);
    }

    const user = await db
      .insert(users)
      .values({
        email,
        username,
        uid,
        firstName,
        lastName,
        dateOfBirth,
        isAdmin: false,
        isSocial: true,
        isVerified: false,
        phone,
        profileImage,
        profileImageKey,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await db.insert(userOauth).values({
      uid,
      provider,
      createdAt: new Date(),
    });
    return res.status(200).json(user[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" + error });
  }
};

