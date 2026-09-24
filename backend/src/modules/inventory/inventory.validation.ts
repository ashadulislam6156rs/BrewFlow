import { z } from "zod";

const decimalNonNeg = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Must be non-negative");

export const createInventoryItemSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().min(1).max(50),
  barcode: z.string().max(50).optional().nullable(),
  type: z.enum(["RAW_MATERIAL", "PACKAGING", "FINISHED_GOOD", "CONSUMABLE", "OTHER"]),
  trackingMode: z.enum(["NONE", "BATCH", "SERIAL", "EXPIRY"]).optional(),
  unitId: z.string().cuid(),
  reorderLevel: decimalNonNeg.optional(),
  reorderQuantity: decimalNonNeg.optional(),
  standardCost: decimalNonNeg.optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateInventoryItemSchema = createInventoryItemSchema.partial();

export const listInventoryItemsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(["RAW_MATERIAL", "PACKAGING", "FINISHED_GOOD", "CONSUMABLE", "OTHER"]).optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  search: z.string().max(100).optional(),
  branchId: z.string().cuid().optional(),
  lowStock: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const inventoryItemIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const adjustStockSchema = z.object({
  branchId: z.string().cuid(),
  quantity: z
    .union([z.string(), z.number()])
    .transform((v) => String(v))
    .refine((v) => !isNaN(Number(v)) && Number(v) !== 0, "Quantity cannot be zero"),
  type: z.enum([
    "ADJUSTMENT_IN",
    "ADJUSTMENT_OUT",
    "WASTE",
    "DAMAGE",
    "STOCK_COUNT",
    "OPENING",
  ]),
  unitCost: decimalNonNeg.optional().nullable(),
  batchNumber: z.string().max(50).optional().nullable(),
  manufacturingDate: z.coerce.date().optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
});

export const listBalancesQuerySchema = z.object({
  branchId: z.string().cuid().optional(),
  inventoryItemId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listMovementsQuerySchema = z.object({
  branchId: z.string().cuid().optional(),
  inventoryItemId: z.string().cuid().optional(),
  type: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
export type ListInventoryItemsQuery = z.infer<typeof listInventoryItemsQuerySchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type ListBalancesQuery = z.infer<typeof listBalancesQuerySchema>;
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>;
