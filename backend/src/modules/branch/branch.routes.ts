import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createBranch,
  listBranches,
  getBranch,
  updateBranch,
  deleteBranch,
} from "./branch.controller.js";
import {
  createBranchSchema,
  updateBranchSchema,
  branchIdParamSchema,
  listBranchesQuerySchema,
} from "./branch.validation.js";

const router = Router();

router.use(authenticate);

// GET /api/v1/branches
router.get("/", validate(listBranchesQuerySchema, "query"), listBranches);

// POST /api/v1/branches
router.post(
  "/",
  authorize("Owner", "Admin"),
  validate(createBranchSchema),
  createBranch
);

// GET /api/v1/branches/:id
router.get(
  "/:id",
  validate(branchIdParamSchema, "params"),
  getBranch
);

// PATCH /api/v1/branches/:id
router.patch(
  "/:id",
  authorize("Owner", "Admin"),
  validate(branchIdParamSchema, "params"),
  validate(updateBranchSchema),
  updateBranch
);

// DELETE /api/v1/branches/:id
router.delete(
  "/:id",
  authorize("Owner", "Admin"),
  validate(branchIdParamSchema, "params"),
  deleteBranch
);

export default router;
