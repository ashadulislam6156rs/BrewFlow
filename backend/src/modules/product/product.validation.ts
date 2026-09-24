import { z } from "zod";

const decimalString = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Must be a non-negative number");

export const createProductSchema = z.object({
  categoryId: z.string().cuid(),
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers and hyphens"),
  sku: z.string().min(1).max(50),
  barcode: z.string().max(50).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  productType: z.enum(["FOOD", "BEVERAGE", "COMBO", "MERCHANDISE"]).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  basePrice: decimalString,
  costPrice: decimalString.optional().nullable(),
  taxRateId: z.string().cuid().optional().nullable(),
  isFeatured: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  trackInventory: z.boolean().optional(),
  prepTimeMin: z.number().int().min(0).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  // nested optional on create
  variants: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        sku: z.string().min(1).max(50),
        barcode: z.string().max(50).optional().nullable(),
        price: decimalString,
        costPrice: decimalString.optional().nullable(),
        isDefault: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .optional(),
  imageAssetIds: z.array(z.string().cuid()).optional(),
  modifierGroupIds: z.array(z.string().cuid()).optional(),
  branchIds: z.array(z.string().cuid()).optional(),
});

export const updateProductSchema = z.object({
  categoryId: z.string().cuid().optional(),
  name: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  sku: z.string().min(1).max(50).optional(),
  barcode: z.string().max(50).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  productType: z.enum(["FOOD", "BEVERAGE", "COMBO", "MERCHANDISE"]).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  basePrice: decimalString.optional(),
  costPrice: decimalString.optional().nullable(),
  taxRateId: z.string().cuid().optional().nullable(),
  isFeatured: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  trackInventory: z.boolean().optional(),
  prepTimeMin: z.number().int().min(0).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  categoryId: z.string().cuid().optional(),
  productType: z.enum(["FOOD", "BEVERAGE", "COMBO", "MERCHANDISE"]).optional(),
  isFeatured: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  isAvailable: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  search: z.string().max(100).optional(),
  branchId: z.string().cuid().optional(),
});

export const productIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const createVariantSchema = z.object({
  name: z.string().min(1).max(100),
  sku: z.string().min(1).max(50),
  barcode: z.string().max(50).optional().nullable(),
  price: decimalString,
  costPrice: decimalString.optional().nullable(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateVariantSchema = createVariantSchema.partial();

export const addProductImageSchema = z.object({
  assetId: z.string().cuid(),
  sortOrder: z.number().int().min(0).optional(),
  isPrimary: z.boolean().optional(),
  altText: z.string().max(200).optional(),
});

export const updateProductBranchSchema = z.object({
  price: decimalString.optional().nullable(),
  costPrice: decimalString.optional().nullable(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  inventoryMode: z.enum(["NONE", "BATCH", "SERIAL", "EXPIRY"]).optional(),
  prepTimeMin: z.number().int().min(0).optional().nullable(),
});

export const setProductBranchesSchema = z.object({
  branches: z.array(
    z.object({
      branchId: z.string().cuid(),
      price: decimalString.optional().nullable(),
      costPrice: decimalString.optional().nullable(),
      isAvailable: z.boolean().optional(),
      isFeatured: z.boolean().optional(),
      inventoryMode: z.enum(["NONE", "BATCH", "SERIAL", "EXPIRY"]).optional(),
      prepTimeMin: z.number().int().min(0).optional().nullable(),
    })
  ),
});

export const setProductModifierGroupsSchema = z.object({
  modifierGroupIds: z.array(z.string().cuid()),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
export type AddProductImageInput = z.infer<typeof addProductImageSchema>;
export type UpdateProductBranchInput = z.infer<typeof updateProductBranchSchema>;
export type SetProductBranchesInput = z.infer<typeof setProductBranchesSchema>;
export type SetProductModifierGroupsInput = z.infer<typeof setProductModifierGroupsSchema>;
