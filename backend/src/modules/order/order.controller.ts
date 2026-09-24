import type { Request, Response } from "express";
import { orderService } from "./order.service.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  CreateOrderInput,
  UpdateOrderStatusInput,
  AddPaymentInput,
  CreateRefundInput,
  ListOrdersQuery,
} from "./order.validation.js";

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const result = await orderService.create(
    req.user!.organizationId,
    req.user!.userId,
    req.body as CreateOrderInput
  );
  return sendSuccess(res, result, "Order created successfully", 201);
});

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListOrdersQuery;
  const { items, total, page, limit } = await orderService.list(
    req.user!.organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Orders fetched");
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const result = await orderService.getById(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Order fetched successfully");
});

export const updateOrderStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await orderService.updateStatus(
      req.user!.organizationId,
      req.params.id,
      req.user!.userId,
      req.body as UpdateOrderStatusInput
    );
    return sendSuccess(res, result, "Order status updated");
  }
);

export const addPayment = asyncHandler(async (req: Request, res: Response) => {
  const result = await orderService.addPayment(
    req.user!.organizationId,
    req.params.id,
    req.body as AddPaymentInput
  );
  return sendSuccess(res, result, "Payment recorded");
});

export const createRefund = asyncHandler(async (req: Request, res: Response) => {
  const result = await orderService.createRefund(
    req.user!.organizationId,
    req.params.id,
    req.body as CreateRefundInput
  );
  return sendSuccess(res, result, "Refund processed");
});
