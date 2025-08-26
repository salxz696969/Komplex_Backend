import { Request, Response } from "express";

import { db } from "../../../db";
import { users } from "../../../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

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

export const createAdmin = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db
      .insert(users)
      .values({
        firstName,
        lastName,
        email,
        phone,
        password: hashedPassword,
        isAdmin: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to create admin" });
  }
};

export const updateAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db
      .update(users)
      .set({ firstName, lastName, email, password: hashedPassword })
      .where(eq(users.id, Number(id)))
      .returning();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to update admin" });
  }
};

export const deleteAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db
      .delete(users)
      .where(eq(users.id, Number(id)))
      .returning();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to delete admin" });
  }
};
