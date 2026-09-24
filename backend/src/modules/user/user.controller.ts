import type { Request, Response } from "express";
import { userService } from "./user.service.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  CreateUserInput,
  UpdateUserInput,
  ListUsersQuery,
  AssignRolesInput,
  AssignBranchesInput,
} from "./user.validation.js";

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const input = req.body as CreateUserInput;
  const result = await userService.create(organizationId, input);
  return sendSuccess(res, result, "User created successfully", 201);
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const query = req.query as unknown as ListUsersQuery;
  const { items, total, page, limit } = await userService.list(
    organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Users fetched successfully");
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const { id } = req.params;
  const result = await userService.getById(organizationId, id);
  return sendSuccess(res, result, "User fetched successfully");
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const requesterId = req.user!.userId;
  const { id } = req.params;
  const input = req.body as UpdateUserInput;
  const result = await userService.update(
    organizationId,
    id,
    input,
    requesterId
  );
  return sendSuccess(res, result, "User updated successfully");
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const requesterId = req.user!.userId;
  const { id } = req.params;
  const result = await userService.delete(organizationId, id, requesterId);
  return sendSuccess(res, result, "User suspended successfully");
});

export const assignRoles = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const { id } = req.params;
  const input = req.body as AssignRolesInput;
  const result = await userService.assignRoles(organizationId, id, input);
  return sendSuccess(res, result, "Roles assigned successfully");
});

export const assignBranches = asyncHandler(
  async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const { id } = req.params;
    const input = req.body as AssignBranchesInput;
    const result = await userService.assignBranches(organizationId, id, input);
    return sendSuccess(res, result, "Branches assigned successfully");
  }
);
