import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createZone,
  listZones,
  updateZone,
  deleteZone,
  createRider,
  listRiders,
  updateRider,
  listDeliveries,
  getDelivery,
  assignRider,
  updateDeliveryStatus,
} from "./delivery.controller.js";
import {
  createDeliveryZoneSchema,
  updateDeliveryZoneSchema,
  createRiderSchema,
  updateRiderSchema,
  assignDeliverySchema,
  updateDeliveryStatusSchema,
  idParamSchema,
} from "./delivery.validation.js";

const router = Router();
router.use(authenticate);

// Zones
router.get("/zones", listZones);
router.post(
  "/zones",
  authorize("Owner", "Admin"),
  validate(createDeliveryZoneSchema),
  createZone
);
router.patch(
  "/zones/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  validate(updateDeliveryZoneSchema),
  updateZone
);
router.delete(
  "/zones/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  deleteZone
);

// Riders
router.get("/riders", listRiders);
router.post(
  "/riders",
  authorize("Owner", "Admin"),
  validate(createRiderSchema),
  createRider
);
router.patch(
  "/riders/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  validate(updateRiderSchema),
  updateRider
);

// Deliveries
router.get("/", listDeliveries);
router.get("/:id", validate(idParamSchema, "params"), getDelivery);
router.post(
  "/:id/assign",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  validate(assignDeliverySchema),
  assignRider
);
router.patch(
  "/:id/status",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  validate(updateDeliveryStatusSchema),
  updateDeliveryStatus
);

export default router;
