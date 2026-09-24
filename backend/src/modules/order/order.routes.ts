import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createOrder,
  listOrders,
  getOrder,
  updateOrderStatus,
  addPayment,
  createRefund,
} from "./order.controller.js";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  addPaymentSchema,
  createRefundSchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
} from "./order.validation.js";

const router = Router();
router.use(authenticate);

router.get("/", validate(listOrdersQuerySchema, "query"), listOrders);
router.post("/", validate(createOrderSchema), createOrder);
router.get("/:id", validate(orderIdParamSchema, "params"), getOrder);
router.patch(
  "/:id/status",
  authorize("Owner", "Admin"),
  validate(orderIdParamSchema, "params"),
  validate(updateOrderStatusSchema),
  updateOrderStatus
);
router.post(
  "/:id/payments",
  authorize("Owner", "Admin"),
  validate(orderIdParamSchema, "params"),
  validate(addPaymentSchema),
  addPayment
);
router.post(
  "/:id/refunds",
  authorize("Owner", "Admin"),
  validate(orderIdParamSchema, "params"),
  validate(createRefundSchema),
  createRefund
);

export default router;
