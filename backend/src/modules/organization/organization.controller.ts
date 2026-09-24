import type { Request, Response } from "express";
import { organizationService } from "./organization.service.js";
import { sendSuccess } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type { UpdateOrganizationInput } from "./organization.validation.js";

export const getMyOrganization = asyncHandler(
  async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const result = await organizationService.getMyOrganization(organizationId);
    return sendSuccess(res, result, "Organization fetched successfully");
  }
);

export const updateMyOrganization = asyncHandler(
  async (req: Request, res: Response) => {
    const organizationId = req.user!.organizationId;
    const input = req.body as UpdateOrganizationInput;
    const result = await organizationService.updateMyOrganization(
      organizationId,
      input
    );
    return sendSuccess(res, result, "Organization updated successfully");
  }
);
