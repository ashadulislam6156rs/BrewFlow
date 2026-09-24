import type { Request, Response } from "express";
import { unitService } from "./unit.service.js";
import { sendSuccess } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  CreateUnitInput,
  UpdateUnitInput,
  CreateUnitConversionInput,
  UpdateUnitConversionInput,
} from "./unit.validation.js";

export const listUnits = asyncHandler(async (_req: Request, res: Response) => {
  const result = await unitService.list();
  return sendSuccess(res, result, "Units fetched successfully");
});

export const getUnit = asyncHandler(async (req: Request, res: Response) => {
  const result = await unitService.getById(req.params.id);
  return sendSuccess(res, result, "Unit fetched successfully");
});

export const createUnit = asyncHandler(async (req: Request, res: Response) => {
  const result = await unitService.create(req.body as CreateUnitInput);
  return sendSuccess(res, result, "Unit created successfully", 201);
});

export const updateUnit = asyncHandler(async (req: Request, res: Response) => {
  const result = await unitService.update(
    req.params.id,
    req.body as UpdateUnitInput
  );
  return sendSuccess(res, result, "Unit updated successfully");
});

export const deleteUnit = asyncHandler(async (req: Request, res: Response) => {
  const result = await unitService.delete(req.params.id);
  return sendSuccess(res, result, "Unit deleted successfully");
});

// Conversions
export const listConversions = asyncHandler(async (_req: Request, res: Response) => {
  const result = await unitService.listConversions();
  return sendSuccess(res, result, "Unit conversions fetched successfully");
});

export const createConversion = asyncHandler(async (req: Request, res: Response) => {
  const result = await unitService.createConversion(
    req.body as CreateUnitConversionInput
  );
  return sendSuccess(res, result, "Unit conversion created successfully", 201);
});

export const updateConversion = asyncHandler(async (req: Request, res: Response) => {
  const result = await unitService.updateConversion(
    req.params.id,
    req.body as UpdateUnitConversionInput
  );
  return sendSuccess(res, result, "Unit conversion updated successfully");
});

export const deleteConversion = asyncHandler(async (req: Request, res: Response) => {
  const result = await unitService.deleteConversion(req.params.id);
  return sendSuccess(res, result, "Unit conversion deleted successfully");
});
