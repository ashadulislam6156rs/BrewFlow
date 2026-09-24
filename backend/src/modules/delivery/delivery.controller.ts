import type { Request, Response } from "express";
import { deliveryService } from "./delivery.service.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  CreateDeliveryZoneInput,
  UpdateDeliveryZoneInput,
  CreateRiderInput,
  UpdateRiderInput,
  AssignDeliveryInput,
  UpdateDeliveryStatusInput,
} from "./delivery.validation.js";

export const createZone = asyncHandler(async (req: Request, res: Response) => {
  const result = await deliveryService.createZone(
    req.user!.organizationId,
    req.body as CreateDeliveryZoneInput
  );
  return sendSuccess(res, result, "Delivery zone created", 201);
});

export const listZones = asyncHandler(async (req: Request, res: Response) => {
  const activeOnly = req.query.active === "true";
  const result = await deliveryService.listZones(
    req.user!.organizationId,
    activeOnly
  );
  return sendSuccess(res, result, "Delivery zones fetched");
});

export const updateZone = asyncHandler(async (req: Request, res: Response) => {
  const result = await deliveryService.updateZone(
    req.user!.organizationId,
    req.params.id,
    req.body as UpdateDeliveryZoneInput
  );
  return sendSuccess(res, result, "Delivery zone updated");
});

export const deleteZone = asyncHandler(async (req: Request, res: Response) => {
  const result = await deliveryService.deleteZone(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Delivery zone deleted");
});

export const createRider = asyncHandler(async (req: Request, res: Response) => {
  const result = await deliveryService.createRider(
    req.user!.organizationId,
    req.body as CreateRiderInput
  );
  return sendSuccess(res, result, "Rider created", 201);
});

export const listRiders = asyncHandler(async (req: Request, res: Response) => {
  const result = await deliveryService.listRiders(req.user!.organizationId);
  return sendSuccess(res, result, "Riders fetched");
});

export const updateRider = asyncHandler(async (req: Request, res: Response) => {
  const result = await deliveryService.updateRider(
    req.user!.organizationId,
    req.params.id,
    req.body as UpdateRiderInput
  );
  return sendSuccess(res, result, "Rider updated");
});

export const listDeliveries = asyncHandler(async (req: Request, res: Response) => {
  const { items, total, page, limit } = await deliveryService.listDeliveries(
    req.user!.organizationId,
    {
      status: req.query.status as string | undefined,
      riderId: req.query.riderId as string | undefined,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    }
  );
  return sendPaginated(res, items, total, page, limit, "Deliveries fetched");
});

export const getDelivery = asyncHandler(async (req: Request, res: Response) => {
  const result = await deliveryService.getDelivery(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Delivery fetched");
});

export const assignRider = asyncHandler(async (req: Request, res: Response) => {
  const result = await deliveryService.assignRider(
    req.user!.organizationId,
    req.params.id,
    req.body as AssignDeliveryInput
  );
  return sendSuccess(res, result, "Rider assigned");
});

export const updateDeliveryStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await deliveryService.updateStatus(
      req.user!.organizationId,
      req.params.id,
      req.body as UpdateDeliveryStatusInput
    );
    return sendSuccess(res, result, "Delivery status updated");
  }
);
