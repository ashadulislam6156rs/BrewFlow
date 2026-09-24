import type { Request, Response } from "express";
import { permissionService } from "./permission.service.js";
import { sendSuccess } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  CreatePermissionInput,
  ListPermissionsQuery,
} from "./permission.validation.js";

export const listPermissions = asyncHandler(
  async (req: Request, res: Response) => {
    const query = req.query as unknown as ListPermissionsQuery;
    const result = await permissionService.list(query);
    return sendSuccess(res, result, "Permissions fetched successfully");
  }
);

export const getModules = asyncHandler(async (_req: Request, res: Response) => {
  const result = await permissionService.getModules();
  return sendSuccess(res, result, "Modules fetched successfully");
});

export const createPermission = asyncHandler(
  async (req: Request, res: Response) => {
    const input = req.body as CreatePermissionInput;
    const result = await permissionService.create(input);
    return sendSuccess(res, result, "Permission created successfully", 201);
  }
);

export const getPermission = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await permissionService.getById(id);
    return sendSuccess(res, result, "Permission fetched successfully");
  }
);
