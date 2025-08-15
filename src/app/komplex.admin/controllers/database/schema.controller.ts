import { Request, Response } from "express";
import { db } from "../../../../db";
import { sql } from "drizzle-orm";

interface TableColumn {
  column_name: string;
  data_type: string;
}

interface Table {
  rowCount: number;
  name: string;
  columns: TableColumn[];
}

export const getSchemaData = async (req: Request, res: Response) => {
  try {
    // Get all table names from public schema
    const tableNamesResult = await db.execute(
      sql`SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE' AND table_schema = 'public'`
    );
    const tableNames = tableNamesResult.rows as Array<{ table_name: string }>;

    // Get all column information for public schema
    const tableColumnsResult = await db.execute(
      sql`SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public'`
    );
    const tableColumns = tableColumnsResult.rows as Array<{
      table_name: string;
      column_name: string;
      data_type: string;
    }>;

    const tablesData: Table[] = [];

    // Process each table
    for (const tableNameRow of tableNames) {
      const tableName = tableNameRow.table_name;

      // Filter columns for this specific table
      const tableColumnsForTable = tableColumns.filter(
        (row) => row.table_name === tableName
      );

      // Get row count for this table
      const rowCountResult = await db.execute(
        sql`SELECT COUNT(*) as count FROM ${sql.identifier(tableName)}`
      );
      const rowCount = parseInt(String(rowCountResult.rows[0]?.count || "0"));

      // Build table data object
      tablesData.push({
        rowCount: rowCount,
        name: tableName,
        columns: tableColumnsForTable.map((row) => ({
          column_name: row.column_name,
          data_type: row.data_type, // You can add convertDataType function here if needed
        })),
      });
    }

    return res.status(200).json(tablesData);
  } catch (error: any) {
    console.error("Schema fetch error:", error);
    return res.status(500).json({
      error: "Failed to fetch schema",
      details: error.message,
    });
  }
};
