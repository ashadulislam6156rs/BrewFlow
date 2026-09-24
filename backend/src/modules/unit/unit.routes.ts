import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  listUnits,
  getUnit,
  createUnit,
  updateUnit,
  deleteUnit,
  listConversions,
  createConversion,
  updateConversion,
  deleteConversion,
} from "./unit.controller.js";
import {
  createUnitSchema,
  updateUnitSchema,
  createUnitConversionSchema,
  updateUnitConversionSchema,
  unitIdParamSchema,
} from "./unit.validation.js";

const router = Router();
router.use(authenticate);

// Units
router.get("/", listUnits);
router.post("/", authorize("Owner", "Admin"), validate(createUnitSchema), createUnit);
router.get("/:id", validate(unitIdParamSchema, "params"), getUnit);
router.patch(
  "/:id",
  authorize("Owner", "Admin"),
  validate(unitIdParamSchema, "params"),
  validate(updateUnitSchema),
  updateUnit
);
router.delete(
  "/:id",
  authorize("Owner", "Admin"),
  validate(unitIdParamSchema, "params"),
  deleteUnit
);

export default router;

// Separate router for conversions to avoid param conflict
export const unitConversionRouter = Router();
unitConversionRouter.use(authenticate);

unitConversionRouter.get("/", listConversions);
unitConversionRouter.post(
  "/",
  authorize("Owner", "Admin"),
  validate(createUnitConversionSchema),
  createConversion
);
unitConversionRouter.patch(
  "/:id",
  authorize("Owner", "Admin"),
  validate(unitIdParamSchema, "params"),
  validate(updateUnitConversionSchema),
  updateConversion
);
unitConversionRouter.delete(
  "/:id",
  authorize("Owner", "Admin"),
  validate(unitIdParamSchema, "params"),
  deleteConversion
);
