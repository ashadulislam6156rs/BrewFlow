import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createModifierGroup,
  listModifierGroups,
  getModifierGroup,
  updateModifierGroup,
  deleteModifierGroup,
  createModifier,
  updateModifier,
  deleteModifier,
} from "./modifier.controller.js";
import {
  createModifierGroupSchema,
  updateModifierGroupSchema,
  createModifierSchema,
  updateModifierSchema,
  listModifierGroupsQuerySchema,
  modifierGroupIdParamSchema,
} from "./modifier.validation.js";
import { z } from "zod";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  validate(listModifierGroupsQuerySchema, "query"),
  listModifierGroups
);
router.post(
  "/",
  authorize("Owner", "Admin"),
  validate(createModifierGroupSchema),
  createModifierGroup
);
router.get(
  "/:id",
  validate(modifierGroupIdParamSchema, "params"),
  getModifierGroup
);
router.patch(
  "/:id",
  authorize("Owner", "Admin"),
  validate(modifierGroupIdParamSchema, "params"),
  validate(updateModifierGroupSchema),
  updateModifierGroup
);
router.delete(
  "/:id",
  authorize("Owner", "Admin"),
  validate(modifierGroupIdParamSchema, "params"),
  deleteModifierGroup
);

// Nested modifiers under a group
router.post(
  "/:id/modifiers",
  authorize("Owner", "Admin"),
  validate(modifierGroupIdParamSchema, "params"),
  validate(createModifierSchema),
  createModifier
);
router.patch(
  "/:id/modifiers/:modifierId",
  authorize("Owner", "Admin"),
  validate(
    z.object({ id: z.string().cuid(), modifierId: z.string().cuid() }),
    "params"
  ),
  validate(updateModifierSchema),
  updateModifier
);
router.delete(
  "/:id/modifiers/:modifierId",
  authorize("Owner", "Admin"),
  validate(
    z.object({ id: z.string().cuid(), modifierId: z.string().cuid() }),
    "params"
  ),
  deleteModifier
);

export default router;
