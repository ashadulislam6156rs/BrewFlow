import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createPO,
  listPOs,
  getPO,
  updatePO,
  changePOStatus,
  createGR,
  listGRs,
  getGR,
  postGR,
  cancelGR,
} from "./purchase.controller.js";
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  listPurchaseOrdersQuerySchema,
  purchaseOrderIdParamSchema,
  createGoodsReceiptSchema,
  listGoodsReceiptsQuerySchema,
  goodsReceiptIdParamSchema,
} from "./purchase.validation.js";
import { z } from "zod";

const router = Router();
router.use(authenticate);

// Purchase Orders
router.get("/orders", validate(listPurchaseOrdersQuerySchema, "query"), listPOs);
router.post(
  "/orders",
  authorize("Owner", "Admin"),
  validate(createPurchaseOrderSchema),
  createPO
);
router.get(
  "/orders/:id",
  validate(purchaseOrderIdParamSchema, "params"),
  getPO
);
router.patch(
  "/orders/:id",
  authorize("Owner", "Admin"),
  validate(purchaseOrderIdParamSchema, "params"),
  validate(updatePurchaseOrderSchema),
  updatePO
);
router.post(
  "/orders/:id/status",
  authorize("Owner", "Admin"),
  validate(purchaseOrderIdParamSchema, "params"),
  validate(
    z.object({
      status: z.enum(["REQUESTED", "APPROVED", "REJECTED", "CANCELLED"]),
    })
  ),
  changePOStatus
);

// Goods Receipts
router.get("/receipts", validate(listGoodsReceiptsQuerySchema, "query"), listGRs);
router.post(
  "/receipts",
  authorize("Owner", "Admin"),
  validate(createGoodsReceiptSchema),
  createGR
);
router.get(
  "/receipts/:id",
  validate(goodsReceiptIdParamSchema, "params"),
  getGR
);
router.post(
  "/receipts/:id/post",
  authorize("Owner", "Admin"),
  validate(goodsReceiptIdParamSchema, "params"),
  postGR
);
router.post(
  "/receipts/:id/cancel",
  authorize("Owner", "Admin"),
  validate(goodsReceiptIdParamSchema, "params"),
  cancelGR
);

export default router;
