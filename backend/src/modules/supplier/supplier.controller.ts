import type { Request, Response } from "express";
import { supplierService } from "./supplier.service.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
  ListSuppliersQuery,
} from "./supplier.validation.js";

export const createSupplier = asyncHandler(async (req: Request, res: Response) => {
  const result = await supplierService.create(
    req.user!.organizationId,
    req.body as CreateSupplierInput
  );
  return sendSuccess(res, result, "Supplier created successfully", 201);
});

export const listSuppliers = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListSuppliersQuery;
  const { items, total, page, limit } = await supplierService.list(
    req.user!.organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Suppliers fetched");
});

export const getSupplier = asyncHandler(async (req: Request, res: Response) => {
  const result = await supplierService.getById(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Supplier fetched successfully");
});

export const updateSupplier = asyncHandler(async (req: Request, res: Response) => {
  const result = await supplierService.update(
    req.user!.organizationId,
    req.params.id,
    req.body as UpdateSupplierInput
  );
  return sendSuccess(res, result, "Supplier updated successfully");
});

export const deleteSupplier = asyncHandler(async (req: Request, res: Response) => {
  const result = await supplierService.delete(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Supplier deleted successfully");
});
