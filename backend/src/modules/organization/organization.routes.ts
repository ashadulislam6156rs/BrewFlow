import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  getMyOrganization,
  updateMyOrganization,
} from "./organization.controller.js";
import { updateOrganizationSchema } from "./organization.validation.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/organizations/me
router.get("/me", getMyOrganization);

// PATCH /api/v1/organizations/me
router.patch(
  "/me",
  authorize("Owner", "Admin"),
  validate(updateOrganizationSchema),
  updateMyOrganization
);

export default router;
