import { z } from "zod";

const decimalNonNeg = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Must be non-negative");

const decimalPos = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Must be positive");

// ─── TaxRate ───────────────────────────────────────────────
export const createTaxRateSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().max(20).optional().nullable(),
  type: z.enum(["VAT", "TAX", "SERVICE_CHARGE", "OTHER"]),
  rate: decimalPos,
  isInclusive: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateTaxRateSchema = createTaxRateSchema.partial();

// ─── Discount ──────────────────────────────────────────────
export const createDiscountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: decimalPos,
  maxDiscount: decimalNonNeg.optional().nullable(),
  minOrderAmount: decimalNonNeg.optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateDiscountSchema = createDiscountSchema.partial();

// ─── Promotion ─────────────────────────────────────────────
export const createPromotionSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "EXPIRED"]).optional(),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
  rules: z.record(z.unknown()).optional().nullable(),
  reward: z.record(z.unknown()).optional().nullable(),
});

export const updatePromotionSchema = createPromotionSchema.partial();

// ─── Coupon ────────────────────────────────────────────────
export const createCouponSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(40)
    .transform((v) => v.toUpperCase()),
  description: z.string().max(500).optional().nullable(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: decimalPos,
  minimumOrder: decimalNonNeg.optional().nullable(),
  maximumDiscount: decimalNonNeg.optional().nullable(),
  usageLimit: z.number().int().min(1).optional().nullable(),
  perCustomerLimit: z.number().int().min(1).optional().nullable(),
  startsAt: z.coerce.date().optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED", "EXHAUSTED"]).optional(),
});

export const updateCouponSchema = createCouponSchema.partial();

export const validateCouponSchema = z.object({
  code: z.string().min(1).max(40),
  orderAmount: decimalNonNeg,
  customerId: z.string().cuid().optional().nullable(),
});

export const redeemCouponSchema = z.object({
  code: z.string().min(1).max(40),
  orderId: z.string().cuid(),
  customerId: z.string().cuid().optional().nullable(),
  discountAmount: decimalPos,
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  status: z.string().optional(),
  search: z.string().max(100).optional(),
});

export const idParamSchema = z.object({ id: z.string().cuid() });

export type CreateTaxRateInput = z.infer<typeof createTaxRateSchema>;
export type UpdateTaxRateInput = z.infer<typeof updateTaxRateSchema>;
export type CreateDiscountInput = z.infer<typeof createDiscountSchema>;
export type UpdateDiscountInput = z.infer<typeof updateDiscountSchema>;
export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type UpdatePromotionInput = z.infer<typeof updatePromotionSchema>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
export type RedeemCouponInput = z.infer<typeof redeemCouponSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
