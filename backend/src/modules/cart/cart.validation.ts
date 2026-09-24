import { z } from "zod";

const decimalPos = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Must be positive");

export const getOrCreateCartSchema = z.object({
  sessionToken: z.string().min(1).max(100).optional(),
  customerId: z.string().cuid().optional().nullable(),
  branchId: z.string().cuid().optional().nullable(),
});

export const addCartItemSchema = z.object({
  productId: z.string().cuid(),
  variantId: z.string().cuid().optional().nullable(),
  quantity: decimalPos,
  unitPrice: z
    .union([z.string(), z.number()])
    .transform((v) => String(v))
    .optional(),
  modifierSnapshot: z.array(z.record(z.unknown())).optional().nullable(),
});

export const updateCartItemSchema = z.object({
  quantity: decimalPos,
  modifierSnapshot: z.array(z.record(z.unknown())).optional().nullable(),
});

export const cartTokenParamSchema = z.object({
  token: z.string().min(1),
});

export const cartItemParamSchema = z.object({
  token: z.string().min(1),
  itemId: z.string().cuid(),
});

export type GetOrCreateCartInput = z.infer<typeof getOrCreateCartSchema>;
export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
