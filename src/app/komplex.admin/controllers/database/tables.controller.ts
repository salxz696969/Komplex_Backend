import { Request, Response } from "express";
import { db } from "../../../../db/index.js";
import { sql } from "drizzle-orm";

export const getTables = async (req: Request, res: Response) => {
  try {
    const tablesResult = await db.execute(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );

    const tables = tablesResult.rows.map((row: any) => row.table_name);

    return res.status(200).json(tables);
  } catch (error: any) {
    console.error("Error fetching tables:", error);
    return res.status(500).json({
      error: "Failed to fetch tables",
      details: error.message,
    });
  }
};
