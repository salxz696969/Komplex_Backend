import { Request, Response } from "express";
import { db } from "../../../../db/index.js";
import { sql } from "drizzle-orm";

interface UserData {
  username: string;
  isSuperuser: boolean;
  isCreateDB: boolean;
  isReplicable: boolean;
  byPassRLS: boolean;
  passwordExpire: string | null;
}

interface CreateUserBody {
  username: string;
  password: string;
  role?: string;
}

export const getUsers = async (req: Request, res: Response) => {
  try {
    // Get users from pg_user table (excluding specific usernames)
    const usersResult = await db.execute(
      sql`SELECT usename, usesuper, usecreatedb, userepl, usebypassrls, valuntil FROM pg_user WHERE passwd IS NOT NULL 
      AND usename NOT IN ('michael', 'emily', 'john', 'donald', 'maria', 'jessica', 'henry', 'gemma', 'jerry')`
    );

    const data: UserData[] = usersResult.rows.map((user: any) => ({
      username: user.usename,
      isSuperuser: user.usesuper || false,
      isCreateDB: user.usecreatedb || false,
      isReplicable: user.userepl || false,
      byPassRLS: user.usebypassrls || false,
      passwordExpire: user.valuntil || null,
    }));

    return res.status(200).json(data);
  } catch (error: any) {
    console.error("Get users error:", error);
    return res.status(500).json({
      error: "Failed to fetch users",
      details: error.message,
    });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { username, password, role }: CreateUserBody = req.body;

    // Check for restricted usernames
    const restrictedUsernames = [
      "michael",
      "emily",
      "john",
      "donald",
      "maria",
      "jessica",
      "henry",
      "gemma",
      "jerry",
    ];

    if (restrictedUsernames.includes(username)) {
      return res.status(400).json({
        error: "Cannot create user with these credentials",
      });
    }

    // Create user
    await db.execute(
      sql`CREATE USER ${sql.identifier(username)} WITH PASSWORD ${password}`
    );

    // Grant role if specified
    if (role) {
      await db.execute(
        sql`GRANT ${sql.identifier(role)} TO ${sql.identifier(username)}`
      );
    }

    return res.status(201).json({
      message: "User created successfully",
    });
  } catch (error: any) {
    console.error("Create user error:", error);
    return res.status(500).json({
      error: "Failed to create user",
      details: error.message,
    });
  }
};

export const getUserRole = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    // Get the user's current role
    const roleResult = await db.execute(
      sql`SELECT r.rolname FROM pg_catalog.pg_roles r 
       JOIN pg_catalog.pg_auth_members m ON m.roleid = r.oid 
       JOIN pg_catalog.pg_roles u ON u.oid = m.member 
       WHERE u.rolname = ${username} 
       AND r.rolname NOT LIKE 'pg_%'`
    );

    const role = roleResult.rows.length > 0 ? roleResult.rows[0].rolname : null;
    return res.status(200).json({ role });
  } catch (error: any) {
    console.error("Failed to fetch user role:", error);
    return res.status(500).json({
      error: "Failed to fetch user role",
      details: error.message,
    });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const { username: newUsername, password, role } = req.body;

    if (password !== "") {
      await db.execute(
        sql`ALTER USER ${sql.identifier(username)} WITH PASSWORD ${password}`
      );
    }

    if (newUsername !== username && newUsername !== "") {
      await db.execute(
        sql`ALTER USER ${sql.identifier(username)} RENAME TO ${sql.identifier(
          newUsername
        )}`
      );
    }

    if (role !== "") {
      // First revoke all existing roles
      const currentRolesResult = await db.execute(
        sql`SELECT r.rolname FROM pg_catalog.pg_roles r 
         JOIN pg_catalog.pg_auth_members m ON m.roleid = r.oid 
         JOIN pg_catalog.pg_roles u ON u.oid = m.member 
         WHERE u.rolname = ${username}`
      );

      for (const roleRow of currentRolesResult.rows) {
        const roleName = String(roleRow.rolname);
        await db.execute(
          sql`REVOKE ${sql.identifier(roleName)} FROM ${sql.identifier(
            username
          )}`
        );
      }

      // Then grant the new role
      await db.execute(
        sql`GRANT ${sql.identifier(role)} TO ${sql.identifier(username)}`
      );
    }

    return res.status(200).json({
      message: "User updated successfully",
    });
  } catch (error: any) {
    console.error("Failed to update user:", error);
    return res.status(500).json({
      error: "Failed to update user",
      details: error.message,
    });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    await db.execute(sql`DROP USER ${sql.identifier(username)}`);

    return res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error: any) {
    console.error("Failed to delete user:", error);
    return res.status(500).json({
      error: "Failed to delete user",
      details: error.message,
    });
  }
};
