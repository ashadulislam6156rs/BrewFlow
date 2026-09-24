import { z } from "zod";

const decimalPos = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Must be positive");

const decimalNonNeg = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Must be non-negative");

export const createRecipeSchema = z.object({
  productId: z.string().cuid(),
  variantId: z.string().cuid().optional().nullable(),
  name: z.string().max(200).optional().nullable(),
  yieldQuantity: decimalPos.optional().nullable(),
  isActive: z.boolean().optional(),
  ingredients: z
    .array(
      z.object({
        inventoryItemId: z.string().cuid(),
        unitId: z.string().cuid(),
        quantity: decimalPos,
        wastagePercent: decimalNonNeg.optional(),
      })
    )
    .min(1),
});

export const updateRecipeSchema = z.object({
  name: z.string().max(200).optional().nullable(),
  yieldQuantity: decimalPos.optional().nullable(),
  isActive: z.boolean().optional(),
  ingredients: z
    .array(
      z.object({
        inventoryItemId: z.string().cuid(),
        unitId: z.string().cuid(),
        quantity: decimalPos,
        wastagePercent: decimalNonNeg.optional(),
      })
    )
    .optional(),
});

export const listRecipesQuerySchema = z.object({
  productId: z.string().cuid().optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const recipeIdParamSchema = z.object({
  id: z.string().cuid(),
});

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
export type ListRecipesQuery = z.infer<typeof listRecipesQuerySchema>;
