import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createTransfer,
  listTransfers,
  getTransfer,
  updateTransfer,
  requestTransfer,
  approveTransfer,
  rejectTransfer,
  shipTransfer,
  cancelTransfer,
  receiveTransfer,
} from "./transfer.controller.js";
import {
  createStockTransferSchema,
  updateStockTransferSchema,
  receiveTransferSchema,
  listStockTransfersQuerySchema,
  stockTransferIdParamSchema,
} from "./transfer.validation.js";

const router = Router();
router.use(authenticate);

router.get("/", validate(listStockTransfersQuerySchema, "query"), listTransfers);
router.post(
  "/",
  authorize("Owner", "Admin"),
  validate(createStockTransferSchema),
  createTransfer
);
router.get("/:id", validate(stockTransferIdParamSchema, "params"), getTransfer);
router.patch(
  "/:id",
  authorize("Owner", "Admin"),
  validate(stockTransferIdParamSchema, "params"),
  validate(updateStockTransferSchema),
  updateTransfer
);

router.post(
  "/:id/request",
  authorize("Owner", "Admin"),
  validate(stockTransferIdParamSchema, "params"),
  requestTransfer
);
router.post(
  "/:id/approve",
  authorize("Owner", "Admin"),
  validate(stockTransferIdParamSchema, "params"),
  approveTransfer
);
router.post(
  "/:id/reject",
  authorize("Owner", "Admin"),
  validate(stockTransferIdParamSchema, "params"),
  rejectTransfer
);
router.post(
  "/:id/ship",
  authorize("Owner", "Admin"),
  validate(stockTransferIdParamSchema, "params"),
  shipTransfer
);
router.post(
  "/:id/cancel",
  authorize("Owner", "Admin"),
  validate(stockTransferIdParamSchema, "params"),
  cancelTransfer
);
router.post(
  "/:id/receive",
  authorize("Owner", "Admin"),
  validate(stockTransferIdParamSchema, "params"),
  validate(receiveTransferSchema),
  receiveTransfer
);

export default router;
