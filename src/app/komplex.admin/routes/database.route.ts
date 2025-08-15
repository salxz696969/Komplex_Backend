import { Router } from "express";
import { getDashboardData } from "../controllers/database/dashboard.controller";
import { getSchemaData } from "../controllers/database/schema.controller";
import {
  createUser,
  deleteUser,
  getUsers,
  updateUser,
} from "../controllers/database/users.controller";
import {
  createRole,
  deleteRole,
  getRoles,
  updateRoleName,
} from "../controllers/database/roles.controller";
import {
  updateRolePrivileges,
  updateRoleTableAccess,
} from "../controllers/database/roles.controller";
import { getPrivileges } from "../controllers/database/privileges.controller";
import { getTables } from "../controllers/database/tables.controller";
import { executeConsoleCommand } from "../controllers/database/console.controller";
const router = Router();

router.get("/dashboard", getDashboardData);
router.get("/schema", getSchemaData);
router.get("/users", getUsers);
router.post("/users", createUser);
router.put("/users/:username", updateUser);
router.delete("/users/:username", deleteUser);
router.get("/roles", getRoles);
router.post("/roles", createRole);
router.put("/roles/:rolename", updateRoleName);
router.delete("/roles/:rolename", deleteRole);
router.put("/roles/:rolename/privileges", updateRolePrivileges);
router.put("/roles/:rolename/tables", updateRoleTableAccess);
router.get("/privileges", getPrivileges);
router.get("/tables", getTables);
router.post("/console", executeConsoleCommand);

export default router;
