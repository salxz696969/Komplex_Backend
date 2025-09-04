import { Request, Response } from "express";
import { db } from "../../../../db/index.js";
import { sql } from "drizzle-orm";

interface TablePrivileges {
  name: string;
  privileges: string[];
}

interface RolesData {
  role: string;
  tables: TablePrivileges[];
}

export const getRoles = async (req: Request, res: Response) => {
  try {
    const data: RolesData[] = [];

    // Get all non-system roles
    const rolesResult = await db.execute(
      sql`SELECT rolname, rolpassword FROM pg_authid WHERE rolname NOT LIKE 'pg_%' AND rolpassword IS NULL`
    );

    // Get all privileges
    const privilegesResult = await db.execute(
      sql`SELECT grantee, table_name, privilege_type 
       FROM information_schema.role_table_grants 
       WHERE table_schema != 'information_schema'
       AND table_schema != 'pg_catalog'
       AND grantee != 'postgres'
       ORDER BY grantee, table_schema, table_name`
    );

    // Create a map to store privileges by role
    const roleMap = new Map<string, RolesData>();

    // Initialize roles with empty tables array
    rolesResult.rows.forEach((role: any) => {
      roleMap.set(role.rolname, {
        role: role.rolname,
        tables: [],
      });
    });

    // Group privileges by role and table
    privilegesResult.rows.forEach((privilege: any) => {
      const roleData = roleMap.get(privilege.grantee);
      if (roleData) {
        // Find existing table entry or create new one
        let tableEntry = roleData.tables.find(
          (t) => t.name === privilege.table_name
        );
        if (!tableEntry) {
          tableEntry = {
            name: privilege.table_name,
            privileges: [],
          };
          roleData.tables.push(tableEntry);
        }
        // Add privilege if not already present
        if (!tableEntry.privileges.includes(privilege.privilege_type)) {
          tableEntry.privileges.push(privilege.privilege_type);
        }
      }
    });

    // Convert map to array
    data.push(...Array.from(roleMap.values()));

    return res.status(200).json(data);
  } catch (error: any) {
    console.error("Error fetching roles:", error);
    return res.status(500).json({
      error: "Failed to fetch roles",
      details: error.message,
    });
  }
};

export const createRole = async (req: Request, res: Response) => {
  try {
    const {
      role,
      tableAndPrivileges,
    }: { role: string; tableAndPrivileges: TablePrivileges[] } = req.body;

    await db.execute(sql`CREATE ROLE ${sql.identifier(role)}`);

    for (const table of tableAndPrivileges) {
      for (const privilege of table.privileges) {
        await db.execute(
          sql`GRANT ${sql.identifier(privilege)} ON TABLE ${sql.identifier(
            table.name
          )} TO ${sql.identifier(role)}`
        );
      }
    }

    return res.status(201).json({
      message: "Role created successfully",
    });
  } catch (error: any) {
    console.error("Error creating role:", error);
    return res.status(500).json({
      error: "Failed to create role",
      details: error.message,
    });
  }
};

export const updateRoleName = async (req: Request, res: Response) => {
  try {
    const { oldRole, newRole } = req.body;

    await db.execute(
      sql`ALTER ROLE ${sql.identifier(oldRole)} RENAME TO ${sql.identifier(
        newRole
      )}`
    );

    return res.status(200).json({
      message: "Role updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating role:", error);
    return res.status(500).json({
      error: "Failed to update role",
      details: error.message,
    });
  }
};

export const deleteRole = async (req: Request, res: Response) => {
  try {
    const { role } = req.params;

    await db.execute(sql`DROP ROLE ${sql.identifier(role)}`);

    return res.status(200).json({
      message: "Role deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting role:", error);
    return res.status(500).json({
      error: "Failed to delete role",
      details: error.message,
    });
  }
};

export const updateRolePrivileges = async (req: Request, res: Response) => {
  try {
    const { role } = req.params;
    const { table, updatedPrivileges } = req.body;

    // Revoke all privileges from that table for that role
    await db.execute(
      sql`REVOKE ALL ON TABLE ${sql.identifier(table)} FROM ${sql.identifier(
        role
      )}`
    );

    console.log("updatedPrivileges", updatedPrivileges);

    // Grant the updated privileges
    for (const privilege of updatedPrivileges) {
      await db.execute(
        sql`GRANT ${sql.identifier(privilege)} ON TABLE ${sql.identifier(
          table
        )} TO ${sql.identifier(role)}`
      );
    }

    return res.status(200).json({
      message: "Privileges of role updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating role privileges:", error);
    return res.status(500).json({
      error: "Failed to update role privileges",
      details: error.message,
    });
  }
};

export const updateRoleTableAccess = async (req: Request, res: Response) => {
  try {
    const { role } = req.params;
    const { updatedTables } = req.body;

    // Get all tables that the role has access to
    const currentTablesResult = await db.execute(
      sql`SELECT DISTINCT table_name FROM information_schema.role_table_grants WHERE grantee = ${role}`
    );

    // Get all table names that the role has access to
    const currentTablesNames = currentTablesResult.rows.map(
      (table: any) => table.table_name
    );

    if (updatedTables.length > currentTablesNames.length) {
      console.log(
        "tables are added, updatedTables, currentTablesNames",
        updatedTables,
        currentTablesNames
      );

      // Find the added tables
      const addedTables = updatedTables.filter(
        (table: string) => !currentTablesNames.includes(table)
      );

      // Grant select privileges on all added tables
      for (const table of addedTables) {
        await db.execute(
          sql`GRANT SELECT ON TABLE ${sql.identifier(
            table
          )} TO ${sql.identifier(role)}`
        );
      }

      return res.status(200).json({
        message: "Table access of role updated successfully",
      });
    }

    console.log(
      "tables are removed, updatedTables, currentTablesNames",
      updatedTables,
      currentTablesNames
    );

    // Find tables that have been removed
    const removedTables = currentTablesNames.filter(
      (table: string) => !updatedTables.includes(table)
    );

    // Revoke all privileges on all removed tables
    for (const table of removedTables) {
      await db.execute(
        sql`REVOKE ALL ON TABLE ${sql.identifier(table)} FROM ${sql.identifier(
          role
        )}`
      );
    }

    return res.status(200).json({
      message: "Table access of role updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating role table access:", error);
    return res.status(500).json({
      error: "Failed to update role table access",
      details: error.message,
    });
  }
};
