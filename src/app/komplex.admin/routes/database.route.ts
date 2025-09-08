import { Router } from "express";
import { getDashboardData } from "../controllers/database/dashboard.controller.js";
import { getSchemaData } from "../controllers/database/schema.controller.js";
import { createUser, deleteUser, getUsers, updateUser } from "../controllers/database/users.controller.js";
import { createRole, deleteRole, getRoles, updateRoleName } from "../controllers/database/roles.controller.js";
import { updateRolePrivileges, updateRoleTableAccess } from "../controllers/database/roles.controller.js";
import { getPrivileges } from "../controllers/database/privileges.controller.js";
import { getTables } from "../controllers/database/tables.controller.js";
import { executeConsoleCommand } from "../controllers/database/console.controller.js";
import { adminGetBigContentRateLimiter, adminGetSmallContentRateLimiter, adminSmallDeleteRateLimiter, adminSmallPostRateLimiter, adminSmallUpdateRateLimiter } from "@/middleware/redisLimiter.js";
const router = Router();

router.get("/dashboard", adminGetBigContentRateLimiter, getDashboardData);
router.get("/schema", adminGetBigContentRateLimiter, getSchemaData);
router.get("/users", adminGetSmallContentRateLimiter, getUsers);
router.post("/users", adminSmallPostRateLimiter, createUser);
router.put("/users/:username", adminSmallUpdateRateLimiter, updateUser);
router.delete("/users/:username", adminSmallDeleteRateLimiter, deleteUser);
router.get("/roles", adminGetSmallContentRateLimiter, getRoles);
router.post("/roles", adminSmallPostRateLimiter, createRole);
router.put("/roles/:rolename", adminSmallUpdateRateLimiter, updateRoleName);
router.delete("/roles/:rolename", adminSmallDeleteRateLimiter, deleteRole);
router.put("/roles/:rolename/privileges", adminSmallUpdateRateLimiter, updateRolePrivileges);
router.put("/roles/:rolename/tables", adminSmallUpdateRateLimiter, updateRoleTableAccess);
router.get("/privileges", adminGetSmallContentRateLimiter, getPrivileges);
router.get("/tables", adminGetBigContentRateLimiter, getTables);
router.post("/console", adminSmallPostRateLimiter, executeConsoleCommand);

export default router;
