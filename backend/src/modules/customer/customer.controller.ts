import type { Request, Response } from "express";
import { customerService } from "./customer.service.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  ListCustomersQuery,
  CreateAddressInput,
  UpdateAddressInput,
} from "./customer.validation.js";

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const result = await customerService.create(
    req.user!.organizationId,
    req.body as CreateCustomerInput
  );
  return sendSuccess(res, result, "Customer created successfully", 201);
});

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListCustomersQuery;
  const { items, total, page, limit } = await customerService.list(
    req.user!.organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Customers fetched");
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const result = await customerService.getById(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Customer fetched successfully");
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const result = await customerService.update(
    req.user!.organizationId,
    req.params.id,
    req.body as UpdateCustomerInput
  );
  return sendSuccess(res, result, "Customer updated successfully");
});

export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  const result = await customerService.delete(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Customer deleted successfully");
});

export const addAddress = asyncHandler(async (req: Request, res: Response) => {
  const result = await customerService.addAddress(
    req.user!.organizationId,
    req.params.id,
    req.body as CreateAddressInput
  );
  return sendSuccess(res, result, "Address added successfully", 201);
});

export const updateAddress = asyncHandler(async (req: Request, res: Response) => {
  const result = await customerService.updateAddress(
    req.user!.organizationId,
    req.params.id,
    req.params.addressId,
    req.body as UpdateAddressInput
  );
  return sendSuccess(res, result, "Address updated successfully");
});

export const deleteAddress = asyncHandler(async (req: Request, res: Response) => {
  const result = await customerService.deleteAddress(
    req.user!.organizationId,
    req.params.id,
    req.params.addressId
  );
  return sendSuccess(res, result, "Address deleted successfully");
});
