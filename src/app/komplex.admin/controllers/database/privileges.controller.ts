import { Request, Response } from "express";
import { db } from "../../../../db";
import { sql } from "drizzle-orm";

export const getPrivileges = async (req: Request, res: Response) => {
  try {
    const privilegesResult = await db.execute(
      sql`SELECT DISTINCT privilege_type 
       FROM information_schema.role_table_grants 
       WHERE table_schema = 'public' 
       ORDER BY privilege_type`
    );

    const privileges = privilegesResult.rows.map(
      (row: any) => row.privilege_type
    );

    return res.status(200).json(privileges);
  } catch (error: any) {
    console.error("Error fetching privileges:", error);
    return res.status(500).json({
      error: "Failed to fetch privileges",
      details: error.message,
    });
  }
};
