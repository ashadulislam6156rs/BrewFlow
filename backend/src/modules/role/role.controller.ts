import type { Request, Response } from "express";
import { roleService } from "./role.service.js";
import { sendSuccess } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  CreateRoleInput,
  UpdateRoleInput,
  AssignPermissionsInput,
} from "./role.validation.js";

export const createRole = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const input = req.body as CreateRoleInput;
  const result = await roleService.create(organizationId, input);
  return sendSuccess(res, result, "Role created successfully", 201);
});

export const listRoles = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const result = await roleService.list(organizationId);
  return sendSuccess(res, result, "Roles fetched successfully");
});

export const getRole = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const { id } = req.params;
  const result = await roleService.getById(organizationId, id);
  return sendSuccess(res, result, "Role fetched successfully");
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const { id } = req.params;
  const input = req.body as UpdateRoleInput;
  const result = await roleService.update(organizationId, id, input);
  return sendSuccess(res, result, "Role updated successfully");
});

export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
  const organizationId = req.user!.organizationId;
  const { id } = req.params;
  const result = await roleService.delete(organizationId, id);
  return sendSuccess(res, result, "Role deleted successfully");
});

export const assignPermissions = asyncHandler(
  async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const { id } = req.params;
    const input = req.body as AssignPermissionsInput;
    const result = await roleService.assignPermissions(
      organizationId,
      id,
      input
    );
    return sendSuccess(res, result, "Permissions assigned successfully");
  }
);
