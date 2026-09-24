import type { Request, Response } from "express";
import { transferService } from "./transfer.service.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  CreateStockTransferInput,
  UpdateStockTransferInput,
  ReceiveTransferInput,
  ListStockTransfersQuery,
} from "./transfer.validation.js";

export const createTransfer = asyncHandler(async (req: Request, res: Response) => {
  const result = await transferService.create(
    req.user!.organizationId,
    req.user!.userId,
    req.body as CreateStockTransferInput
  );
  return sendSuccess(res, result, "Stock transfer created successfully", 201);
});

export const listTransfers = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListStockTransfersQuery;
  const { items, total, page, limit } = await transferService.list(
    req.user!.organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Stock transfers fetched");
});

export const getTransfer = asyncHandler(async (req: Request, res: Response) => {
  const result = await transferService.getById(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Stock transfer fetched successfully");
});

export const updateTransfer = asyncHandler(async (req: Request, res: Response) => {
  const result = await transferService.update(
    req.user!.organizationId,
    req.params.id,
    req.body as UpdateStockTransferInput
  );
  return sendSuccess(res, result, "Stock transfer updated successfully");
});

export const requestTransfer = asyncHandler(async (req: Request, res: Response) => {
  const result = await transferService.changeStatus(
    req.user!.organizationId,
    req.params.id,
    "request",
    req.user!.userId
  );
  return sendSuccess(res, result, "Transfer requested");
});

export const approveTransfer = asyncHandler(async (req: Request, res: Response) => {
  const result = await transferService.changeStatus(
    req.user!.organizationId,
    req.params.id,
    "approve",
    req.user!.userId
  );
  return sendSuccess(res, result, "Transfer approved");
});

export const rejectTransfer = asyncHandler(async (req: Request, res: Response) => {
  const result = await transferService.changeStatus(
    req.user!.organizationId,
    req.params.id,
    "reject",
    req.user!.userId
  );
  return sendSuccess(res, result, "Transfer rejected");
});

export const shipTransfer = asyncHandler(async (req: Request, res: Response) => {
  const result = await transferService.changeStatus(
    req.user!.organizationId,
    req.params.id,
    "ship",
    req.user!.userId
  );
  return sendSuccess(res, result, "Transfer shipped – stock deducted from source");
});

export const cancelTransfer = asyncHandler(async (req: Request, res: Response) => {
  const result = await transferService.changeStatus(
    req.user!.organizationId,
    req.params.id,
    "cancel",
    req.user!.userId
  );
  return sendSuccess(res, result, "Transfer cancelled");
});

export const receiveTransfer = asyncHandler(async (req: Request, res: Response) => {
  const result = await transferService.receive(
    req.user!.organizationId,
    req.params.id,
    req.user!.userId,
    req.body as ReceiveTransferInput
  );
  return sendSuccess(res, result, "Transfer received – stock added to destination");
});
