import type { Request, Response } from "express";
import { branchService } from "./branch.service.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  CreateBranchInput,
  UpdateBranchInput,
  ListBranchesQuery,
} from "./branch.validation.js";

export const createBranch = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const input = req.body as CreateBranchInput;
  const result = await branchService.create(organizationId, input);
  return sendSuccess(res, result, "Branch created successfully", 201);
});

export const listBranches = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const query = req.query as unknown as ListBranchesQuery;
  const { items, total, page, limit } = await branchService.list(
    organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Branches fetched successfully");
});

export const getBranch = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const { id } = req.params;
  const result = await branchService.getById(organizationId, id);
  return sendSuccess(res, result, "Branch fetched successfully");
});

export const updateBranch = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const { id } = req.params;
  const input = req.body as UpdateBranchInput;
  const result = await branchService.update(organizationId, id, input);
  return sendSuccess(res, result, "Branch updated successfully");
});

export const deleteBranch = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const { id } = req.params;
  const result = await branchService.delete(organizationId, id);
  return sendSuccess(res, result, "Branch deleted successfully");
});
