import { Request, Response } from "express";

import { db } from "../../../db/index.js";
import { users } from "../../../db/schema.js";
import { eq, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { redis } from "../../../db/redis/redisConfig.js";

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { page } = req.query;
    const pageNumber = Number(page) || 1;
    const limit = 100;
    const offset = (pageNumber - 1) * limit;

    const result = await db
      .select({ userId: users.id })
      .from(users)
      .where(eq(users.isAdmin, false))
      .limit(limit)
      .offset(offset);

    const userKeys = result.map((v) => `users:${v.userId}`);
    const cachedResults = (
      userKeys.length ? ((await redis.mGet(userKeys)) as (string | null)[]) : []
    ) as (string | null)[];
    const hits: any[] = [];
    const missedIds: number[] = [];

    if (cachedResults.length > 0) {
      cachedResults.forEach((item, idx) => {
        if (item) hits.push(JSON.parse(item));
        else missedIds.push(result[idx].userId);
      });
    }

    let missedUsers: any[] = [];
    if (missedIds.length > 0) {
      const userRows = await db
        .select()
        .from(users)
        .where(inArray(users.id, missedIds));
      for (const user of userRows) {
        await redis.set(`users:${user.id}`, JSON.stringify(user), { EX: 600 });
        missedUsers.push(user);
      }
    }

    const allUsersMap = new Map<number, any>();
    hits.forEach((user) => allUsersMap.set(user.id, user));
    missedUsers.forEach((user) => allUsersMap.set(user.id, user));
    const allUsers = result.map((r) => allUsersMap.get(r.userId));

    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

export const getAllAdmins = async (req: Request, res: Response) => {
  try {
    const { page } = req.query;
    const pageNumber = Number(page) || 1;
    const limit = 100;
    const offset = (pageNumber - 1) * limit;

    const result = await db
      .select({ userId: users.id })
      .from(users)
      .where(eq(users.isAdmin, true))
      .limit(limit)
      .offset(offset);

    const adminKeys = result.map((v) => `users:${v.userId}`);
    const cachedResults = (
      adminKeys.length
        ? ((await redis.mGet(adminKeys)) as (string | null)[])
        : []
    ) as (string | null)[];
    const hits: any[] = [];
    const missedIds: number[] = [];

    if (cachedResults.length > 0) {
      cachedResults.forEach((item, idx) => {
        if (item) hits.push(JSON.parse(item));
        else missedIds.push(result[idx].userId);
      });
    }

    let missedUsers: any[] = [];
    if (missedIds.length > 0) {
      const userRows = await db
        .select()
        .from(users)
        .where(inArray(users.id, missedIds));
      for (const user of userRows) {
        await redis.set(`users:${user.id}`, JSON.stringify(user), { EX: 600 });
        missedUsers.push(user);
      }
    }

    const allAdminsMap = new Map<number, any>();
    hits.forEach((user) => allAdminsMap.set(user.id, user));
    missedUsers.forEach((user) => allAdminsMap.set(user.id, user));
    const allAdmins = result.map((r) => allAdminsMap.get(r.userId));

    res.json(allAdmins);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch admins" + error });
  }
};

export const createAdmin = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, uid } = req.body;
    const result = await db
      .insert(users)
      .values({
        firstName,
        lastName,
        email,
        phone,
        uid,
        isAdmin: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    const cacheKey = `users:${result[0].id}`;
    await redis.set(cacheKey, JSON.stringify(result[0]), { EX: 600 });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to create admin" });
  }
};

export const updateAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email } = req.body;
    const result = await db
      .update(users)
      .set({ firstName, lastName, email })
      .where(eq(users.id, Number(id)))
      .returning();
    const cacheKey = `users:${result[0].id}`;
    await redis.set(cacheKey, JSON.stringify(result[0]), { EX: 600 });
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
    await redis.del(`users:${id}`);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to delete admin" });
  }
};
