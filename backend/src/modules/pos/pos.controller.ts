import type { Request, Response } from "express";
import { posService } from "./pos.service.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  CreateDeviceInput,
  UpdateDeviceInput,
  ListDevicesQuery,
  OpenShiftInput,
  CloseShiftInput,
  CreateCashTransactionInput,
  ListShiftsQuery,
} from "./pos.validation.js";

// Devices
export const createDevice = asyncHandler(async (req: Request, res: Response) => {
  const result = await posService.createDevice(
    req.user!.organizationId,
    req.body as CreateDeviceInput
  );
  return sendSuccess(res, result, "POS device created", 201);
});

export const listDevices = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListDevicesQuery;
  const result = await posService.listDevices(req.user!.organizationId, query);
  return sendSuccess(res, result, "POS devices fetched");
});

export const updateDevice = asyncHandler(async (req: Request, res: Response) => {
  const result = await posService.updateDevice(
    req.user!.organizationId,
    req.params.id,
    req.body as UpdateDeviceInput
  );
  return sendSuccess(res, result, "POS device updated");
});

export const deleteDevice = asyncHandler(async (req: Request, res: Response) => {
  const result = await posService.deleteDevice(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "POS device deactivated");
});

export const deviceHeartbeat = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await posService.heartbeat(
      req.user!.organizationId,
      req.params.id
    );
    return sendSuccess(res, result, "Heartbeat recorded");
  }
);

// Shifts
export const openShift = asyncHandler(async (req: Request, res: Response) => {
  const result = await posService.openShift(
    req.user!.organizationId,
    req.user!.userId,
    req.body as OpenShiftInput
  );
  return sendSuccess(res, result, "Shift opened", 201);
});

export const closeShift = asyncHandler(async (req: Request, res: Response) => {
  const result = await posService.closeShift(
    req.user!.organizationId,
    req.params.id,
    req.user!.userId,
    req.body as CloseShiftInput
  );
  return sendSuccess(res, result, "Shift closed");
});

export const listShifts = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListShiftsQuery;
  const { items, total, page, limit } = await posService.listShifts(
    req.user!.organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Shifts fetched");
});

export const getShift = asyncHandler(async (req: Request, res: Response) => {
  const result = await posService.getShiftById(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Shift fetched");
});

export const getCurrentShift = asyncHandler(
  async (req: Request, res: Response) => {
    const branchId = req.query.branchId as string | undefined;
    const result = await posService.getCurrentShift(
      req.user!.organizationId,
      req.user!.userId,
      branchId
    );
    return sendSuccess(
      res,
      result,
      result ? "Current shift found" : "No open shift"
    );
  }
);

// Cash transactions
export const addCashTransaction = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await posService.addCashTransaction(
      req.user!.organizationId,
      req.params.id,
      req.body as CreateCashTransactionInput
    );
    return sendSuccess(res, result, "Cash transaction recorded", 201);
  }
);

export const listCashTransactions = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await posService.listCashTransactions(
      req.user!.organizationId,
      req.params.id
    );
    return sendSuccess(res, result, "Cash transactions fetched");
  }
);
