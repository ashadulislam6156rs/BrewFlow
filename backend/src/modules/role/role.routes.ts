import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createRole,
  listRoles,
  getRole,
  updateRole,
  deleteRole,
  assignPermissions,
} from "./role.controller.js";
import {
  createRoleSchema,
  updateRoleSchema,
  roleIdParamSchema,
  assignPermissionsSchema,
} from "./role.validation.js";

const router = Router();

router.use(authenticate);

// GET /api/v1/roles
router.get("/", listRoles);

// POST /api/v1/roles
router.post(
  "/",
  authorize("Owner", "Admin"),
  validate(createRoleSchema),
  createRole
);

// GET /api/v1/roles/:id
router.get(
  "/:id",
  validate(roleIdParamSchema, "params"),
  getRole
);

// PATCH /api/v1/roles/:id
router.patch(
  "/:id",
  authorize("Owner", "Admin"),
  validate(roleIdParamSchema, "params"),
  validate(updateRoleSchema),
  updateRole
);

// DELETE /api/v1/roles/:id
router.delete(
  "/:id",
  authorize("Owner", "Admin"),
  validate(roleIdParamSchema, "params"),
  deleteRole
);

// POST /api/v1/roles/:id/permissions
router.post(
  "/:id/permissions",
  authorize("Owner", "Admin"),
  validate(roleIdParamSchema, "params"),
  validate(assignPermissionsSchema),
  assignPermissions
);

export default router;
