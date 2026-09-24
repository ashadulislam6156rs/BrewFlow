import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createDevice,
  listDevices,
  updateDevice,
  deleteDevice,
  deviceHeartbeat,
  openShift,
  closeShift,
  listShifts,
  getShift,
  getCurrentShift,
  addCashTransaction,
  listCashTransactions,
} from "./pos.controller.js";
import {
  createDeviceSchema,
  updateDeviceSchema,
  listDevicesQuerySchema,
  openShiftSchema,
  closeShiftSchema,
  createCashTransactionSchema,
  listShiftsQuerySchema,
  idParamSchema,
} from "./pos.validation.js";

const router = Router();
router.use(authenticate);

// Devices
router.get("/devices", validate(listDevicesQuerySchema, "query"), listDevices);
router.post(
  "/devices",
  authorize("Owner", "Admin"),
  validate(createDeviceSchema),
  createDevice
);
router.patch(
  "/devices/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  validate(updateDeviceSchema),
  updateDevice
);
router.delete(
  "/devices/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  deleteDevice
);
router.post(
  "/devices/:id/heartbeat",
  validate(idParamSchema, "params"),
  deviceHeartbeat
);

// Shifts
router.get("/shifts", validate(listShiftsQuerySchema, "query"), listShifts);
router.get("/shifts/current", getCurrentShift);
router.post("/shifts", validate(openShiftSchema), openShift);
router.get("/shifts/:id", validate(idParamSchema, "params"), getShift);
router.post(
  "/shifts/:id/close",
  validate(idParamSchema, "params"),
  validate(closeShiftSchema),
  closeShift
);

// Cash transactions (on a shift)
router.get(
  "/shifts/:id/cash",
  validate(idParamSchema, "params"),
  listCashTransactions
);
router.post(
  "/shifts/:id/cash",
  validate(idParamSchema, "params"),
  validate(createCashTransactionSchema),
  addCashTransaction
);

export default router;
