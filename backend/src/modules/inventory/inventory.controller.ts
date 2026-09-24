import type { Request, Response } from "express";
import { inventoryService } from "./inventory.service.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  ListInventoryItemsQuery,
  AdjustStockInput,
  ListBalancesQuery,
  ListMovementsQuery,
} from "./inventory.validation.js";

export const createItem = asyncHandler(async (req: Request, res: Response) => {
  const result = await inventoryService.createItem(
    req.user!.organizationId,
    req.body as CreateInventoryItemInput
  );
  return sendSuccess(res, result, "Inventory item created successfully", 201);
});

export const listItems = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListInventoryItemsQuery;
  const { items, total, page, limit } = await inventoryService.listItems(
    req.user!.organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Inventory items fetched");
});

export const getItem = asyncHandler(async (req: Request, res: Response) => {
  const result = await inventoryService.getItemById(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Inventory item fetched successfully");
});

export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const result = await inventoryService.updateItem(
    req.user!.organizationId,
    req.params.id,
    req.body as UpdateInventoryItemInput
  );
  return sendSuccess(res, result, "Inventory item updated successfully");
});

export const deleteItem = asyncHandler(async (req: Request, res: Response) => {
  const result = await inventoryService.deleteItem(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Inventory item deleted successfully");
});

export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  const result = await inventoryService.adjustStock(
    req.user!.organizationId,
    req.params.id,
    req.body as AdjustStockInput
  );
  return sendSuccess(res, result, "Stock adjusted successfully", 201);
});

export const listBalances = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListBalancesQuery;
  const { items, total, page, limit } = await inventoryService.listBalances(
    req.user!.organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Balances fetched");
});

export const listMovements = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListMovementsQuery;
  const { items, total, page, limit } = await inventoryService.listMovements(
    req.user!.organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Stock movements fetched");
});
