import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  listPermissions,
  getModules,
  createPermission,
  getPermission,
} from "./permission.controller.js";
import {
  createPermissionSchema,
  listPermissionsQuerySchema,
} from "./permission.validation.js";
import { z } from "zod";

const router = Router();

router.use(authenticate);

// GET /api/v1/permissions
router.get(
  "/",
  validate(listPermissionsQuerySchema, "query"),
  listPermissions
);

// GET /api/v1/permissions/modules
router.get("/modules", getModules);

// POST /api/v1/permissions (usually for system admin / seed)
router.post(
  "/",
  authorize("Owner"),
  validate(createPermissionSchema),
  createPermission
);

// GET /api/v1/permissions/:id
router.get(
  "/:id",
  validate(z.object({ id: z.string().cuid() }), "params"),
  getPermission
);

export default router;
