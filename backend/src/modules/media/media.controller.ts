import type { Request, Response } from "express";
import { mediaService } from "./media.service.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  RegisterAssetInput,
  UpdateAssetInput,
  ListAssetsQuery,
} from "./media.validation.js";

export const registerAsset = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await mediaService.register(req.body as RegisterAssetInput);
    return sendSuccess(res, result, "Media asset registered", 201);
  }
);

export const listAssets = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListAssetsQuery;
  const { items, total, page, limit } = await mediaService.list(query);
  return sendPaginated(res, items, total, page, limit, "Media assets fetched");
});

export const getAsset = asyncHandler(async (req: Request, res: Response) => {
  const result = await mediaService.getById(req.params.id);
  return sendSuccess(res, result, "Media asset fetched");
});

export const updateAsset = asyncHandler(async (req: Request, res: Response) => {
  const result = await mediaService.update(
    req.params.id,
    req.body as UpdateAssetInput
  );
  return sendSuccess(res, result, "Media asset updated");
});

export const deleteAsset = asyncHandler(async (req: Request, res: Response) => {
  const result = await mediaService.softDelete(req.params.id);
  return sendSuccess(res, result, "Media asset marked for deletion");
});

export const listPendingDelete = asyncHandler(
  async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 50;
    const result = await mediaService.listPendingDelete(limit);
    return sendSuccess(res, result, "Pending delete assets");
  }
);

export const confirmDeleted = asyncHandler(
  async (req: Request, res: Response) => {
    const error = (req.body as { error?: string })?.error;
    const result = await mediaService.confirmDeleted(req.params.id, error);
    return sendSuccess(res, result, "Delete status updated");
  }
);
