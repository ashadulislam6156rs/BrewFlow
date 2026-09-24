import { z } from "zod";

const decimalPos = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Must be positive");

const decimalNonNeg = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Must be non-negative");

export const createStockTransferSchema = z.object({
  fromBranchId: z.string().cuid(),
  toBranchId: z.string().cuid(),
  transferNo: z.string().min(1).max(50).optional(),
  notes: z.string().max(2000).optional().nullable(),
  items: z
    .array(
      z.object({
        inventoryItemId: z.string().cuid(),
        quantity: decimalPos,
        unitCost: decimalNonNeg.optional(),
      })
    )
    .min(1),
});

export const updateStockTransferSchema = z.object({
  notes: z.string().max(2000).optional().nullable(),
  items: z
    .array(
      z.object({
        inventoryItemId: z.string().cuid(),
        quantity: decimalPos,
        unitCost: decimalNonNeg.optional(),
      })
    )
    .min(1)
    .optional(),
});

export const receiveTransferSchema = z.object({
  items: z
    .array(
      z.object({
        inventoryItemId: z.string().cuid(),
        receivedQuantity: decimalNonNeg,
      })
    )
    .min(1),
});

export const listStockTransfersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum([
      "DRAFT",
      "REQUESTED",
      "APPROVED",
      "REJECTED",
      "PACKED",
      "IN_TRANSIT",
      "PARTIALLY_RECEIVED",
      "RECEIVED",
      "CANCELLED",
    ])
    .optional(),
  fromBranchId: z.string().cuid().optional(),
  toBranchId: z.string().cuid().optional(),
  search: z.string().max(100).optional(),
});

export const stockTransferIdParamSchema = z.object({
  id: z.string().cuid(),
});

export type CreateStockTransferInput = z.infer<typeof createStockTransferSchema>;
export type UpdateStockTransferInput = z.infer<typeof updateStockTransferSchema>;
export type ReceiveTransferInput = z.infer<typeof receiveTransferSchema>;
export type ListStockTransfersQuery = z.infer<typeof listStockTransfersQuerySchema>;
