import { Request, Response } from "express";
import { db } from "../../../../db/index.js";
import { sql } from "drizzle-orm";

export const executeConsoleCommand = async (req: Request, res: Response) => {
  try {
    const { command } = req.body;

    // Check for dangerous commands
    const splitCommand = command.split(" ");
    const dangerousCommands = [
      "drop",
      "delete",
      "truncate",
      "alter",
      "rename",
      "create",
      "insert",
      "update",
      "grant",
      "revoke",
    ];

    if (
      splitCommand.some((cmd: string) =>
        dangerousCommands.includes(cmd.toLowerCase())
      )
    ) {
      return res.status(400).json({
        error: "This command is not allowed, only for read operations",
      });
    }

    // // Check for large tables that need LIMIT
    // const largeTables = [
    //   "tickets",
    //   "bookings",
    //   "payments",
    //   "seats",
    //   "screenings",
    //   "customers",
    // ];

    // if (largeTables.includes(splitCommand[splitCommand.length - 1])) {
    //   return res.status(400).json({
    //     error: "Please use LIMIT or OFFSET for this table",
    //   });
    // }

    // Execute the command
    const result = await db.execute(sql.raw(command));

    if (result.rows && result.rows.length > 0) {
      return res.status(200).json(result.rows);
    } else {
      return res.status(404).json({
        error: "No results found",
      });
    }
  } catch (error: any) {
    console.error("Console command error:", error);
    return res.status(500).json({
      error: "Failed to execute command",
      details: error.message,
    });
  }
};
