import { z } from "zod";

const decimalNonNeg = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Must be non-negative");

const decimalPos = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Must be positive");

const poItemSchema = z.object({
  inventoryItemId: z.string().cuid(),
  unitId: z.string().cuid(),
  quantity: decimalPos,
  unitPrice: decimalNonNeg,
  discount: decimalNonNeg.optional(),
  tax: decimalNonNeg.optional(),
});

export const createPurchaseOrderSchema = z.object({
  branchId: z.string().cuid(),
  supplierId: z.string().cuid(),
  purchaseOrderNo: z.string().min(1).max(50).optional(), // auto-gen if omitted
  orderDate: z.coerce.date().optional(),
  expectedDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  items: z.array(poItemSchema).min(1),
});

export const updatePurchaseOrderSchema = z.object({
  expectedDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  items: z.array(poItemSchema).min(1).optional(),
});

export const listPurchaseOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum([
      "DRAFT",
      "REQUESTED",
      "APPROVED",
      "REJECTED",
      "PARTIALLY_RECEIVED",
      "RECEIVED",
      "CANCELLED",
      "CLOSED",
    ])
    .optional(),
  branchId: z.string().cuid().optional(),
  supplierId: z.string().cuid().optional(),
  search: z.string().max(100).optional(),
});

export const purchaseOrderIdParamSchema = z.object({
  id: z.string().cuid(),
});

const grItemSchema = z.object({
  inventoryItemId: z.string().cuid(),
  unitId: z.string().cuid(),
  quantity: decimalPos,
  unitCost: decimalNonNeg,
  batchNumber: z.string().max(50).optional().nullable(),
  expiryDate: z.coerce.date().optional().nullable(),
});

export const createGoodsReceiptSchema = z.object({
  branchId: z.string().cuid(),
  supplierId: z.string().cuid(),
  purchaseOrderId: z.string().cuid().optional().nullable(),
  receiptNo: z.string().min(1).max(50).optional(),
  receivedAt: z.coerce.date().optional(),
  notes: z.string().max(2000).optional().nullable(),
  items: z.array(grItemSchema).min(1),
});

export const listGoodsReceiptsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["DRAFT", "POSTED", "CANCELLED"]).optional(),
  branchId: z.string().cuid().optional(),
  supplierId: z.string().cuid().optional(),
  purchaseOrderId: z.string().cuid().optional(),
});

export const goodsReceiptIdParamSchema = z.object({
  id: z.string().cuid(),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;
export type ListPurchaseOrdersQuery = z.infer<typeof listPurchaseOrdersQuerySchema>;
export type CreateGoodsReceiptInput = z.infer<typeof createGoodsReceiptSchema>;
export type ListGoodsReceiptsQuery = z.infer<typeof listGoodsReceiptsQuerySchema>;
