import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createUser,
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  assignRoles,
  assignBranches,
} from "./user.controller.js";
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
  listUsersQuerySchema,
  assignRolesSchema,
  assignBranchesSchema,
} from "./user.validation.js";

const router = Router();

router.use(authenticate);

// GET /api/v1/users
router.get("/", validate(listUsersQuerySchema, "query"), listUsers);

// POST /api/v1/users
router.post(
  "/",
  authorize("Owner", "Admin"),
  validate(createUserSchema),
  createUser
);

// GET /api/v1/users/:id
router.get(
  "/:id",
  validate(userIdParamSchema, "params"),
  getUser
);

// PATCH /api/v1/users/:id
router.patch(
  "/:id",
  authorize("Owner", "Admin"),
  validate(userIdParamSchema, "params"),
  validate(updateUserSchema),
  updateUser
);

// DELETE /api/v1/users/:id  (soft delete → SUSPENDED)
router.delete(
  "/:id",
  authorize("Owner", "Admin"),
  validate(userIdParamSchema, "params"),
  deleteUser
);

// POST /api/v1/users/:id/roles
router.post(
  "/:id/roles",
  authorize("Owner", "Admin"),
  validate(userIdParamSchema, "params"),
  validate(assignRolesSchema),
  assignRoles
);

// POST /api/v1/users/:id/branches
router.post(
  "/:id/branches",
  authorize("Owner", "Admin"),
  validate(userIdParamSchema, "params"),
  validate(assignBranchesSchema),
  assignBranches
);

export default router;
