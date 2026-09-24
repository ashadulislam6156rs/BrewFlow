import type { Request, Response } from "express";
import { modifierService } from "./modifier.service.js";
import { sendSuccess } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  CreateModifierGroupInput,
  UpdateModifierGroupInput,
  CreateModifierInput,
  UpdateModifierInput,
  ListModifierGroupsQuery,
} from "./modifier.validation.js";

export const createModifierGroup = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await modifierService.createGroup(
      req.user!.organizationId,
      req.body as CreateModifierGroupInput
    );
    return sendSuccess(res, result, "Modifier group created successfully", 201);
  }
);

export const listModifierGroups = asyncHandler(
  async (req: Request, res: Response) => {
    const query = req.query as unknown as ListModifierGroupsQuery;
    const result = await modifierService.listGroups(
      req.user!.organizationId,
      query
    );
    return sendSuccess(res, result, "Modifier groups fetched successfully");
  }
);

export const getModifierGroup = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await modifierService.getGroupById(
      req.user!.organizationId,
      req.params.id
    );
    return sendSuccess(res, result, "Modifier group fetched successfully");
  }
);

export const updateModifierGroup = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await modifierService.updateGroup(
      req.user!.organizationId,
      req.params.id,
      req.body as UpdateModifierGroupInput
    );
    return sendSuccess(res, result, "Modifier group updated successfully");
  }
);

export const deleteModifierGroup = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await modifierService.deleteGroup(
      req.user!.organizationId,
      req.params.id
    );
    return sendSuccess(res, result, "Modifier group deleted successfully");
  }
);

export const createModifier = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await modifierService.createModifier(
      req.user!.organizationId,
      req.params.id, // group id
      req.body as CreateModifierInput
    );
    return sendSuccess(res, result, "Modifier created successfully", 201);
  }
);

export const updateModifier = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await modifierService.updateModifier(
      req.user!.organizationId,
      req.params.modifierId,
      req.body as UpdateModifierInput
    );
    return sendSuccess(res, result, "Modifier updated successfully");
  }
);

export const deleteModifier = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await modifierService.deleteModifier(
      req.user!.organizationId,
      req.params.modifierId
    );
    return sendSuccess(res, result, "Modifier deleted successfully");
  }
);
