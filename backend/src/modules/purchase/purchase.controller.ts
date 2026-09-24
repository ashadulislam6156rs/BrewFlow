import type { Request, Response } from "express";
import { purchaseService } from "./purchase.service.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  ListPurchaseOrdersQuery,
  CreateGoodsReceiptInput,
  ListGoodsReceiptsQuery,
} from "./purchase.validation.js";

// PO
export const createPO = asyncHandler(async (req: Request, res: Response) => {
  const result = await purchaseService.createPO(
    req.user!.organizationId,
    req.user!.userId,
    req.body as CreatePurchaseOrderInput
  );
  return sendSuccess(res, result, "Purchase order created successfully", 201);
});

export const listPOs = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListPurchaseOrdersQuery;
  const { items, total, page, limit } = await purchaseService.listPOs(
    req.user!.organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Purchase orders fetched");
});

export const getPO = asyncHandler(async (req: Request, res: Response) => {
  const result = await purchaseService.getPOById(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Purchase order fetched successfully");
});

export const updatePO = asyncHandler(async (req: Request, res: Response) => {
  const result = await purchaseService.updatePO(
    req.user!.organizationId,
    req.params.id,
    req.body as UpdatePurchaseOrderInput
  );
  return sendSuccess(res, result, "Purchase order updated successfully");
});

export const changePOStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body as {
    status: "REQUESTED" | "APPROVED" | "REJECTED" | "CANCELLED";
  };
  const result = await purchaseService.changePOStatus(
    req.user!.organizationId,
    req.params.id,
    status,
    req.user!.userId
  );
  return sendSuccess(res, result, `Purchase order ${status.toLowerCase()} successfully`);
});

// GR
export const createGR = asyncHandler(async (req: Request, res: Response) => {
  const result = await purchaseService.createGR(
    req.user!.organizationId,
    req.user!.userId,
    req.body as CreateGoodsReceiptInput
  );
  return sendSuccess(res, result, "Goods receipt created successfully", 201);
});

export const listGRs = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListGoodsReceiptsQuery;
  const { items, total, page, limit } = await purchaseService.listGRs(
    req.user!.organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Goods receipts fetched");
});

export const getGR = asyncHandler(async (req: Request, res: Response) => {
  const result = await purchaseService.getGRById(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Goods receipt fetched successfully");
});

export const postGR = asyncHandler(async (req: Request, res: Response) => {
  const result = await purchaseService.postGR(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Goods receipt posted – stock updated");
});

export const cancelGR = asyncHandler(async (req: Request, res: Response) => {
  const result = await purchaseService.cancelGR(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Goods receipt cancelled");
});
