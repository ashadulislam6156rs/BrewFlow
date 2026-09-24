import { z } from "zod";

const decimalNonNeg = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Must be non-negative");

const decimalPos = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Must be positive");

export const createProgramSchema = z.object({
  name: z.string().min(1).max(100),
  pointsPerAmount: decimalPos.optional(), // points earned per 1 currency unit spent
  amountPerPoint: decimalPos.optional(), // currency value of 1 point when redeeming
  minimumRedeemPoints: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateProgramSchema = createProgramSchema.partial();

export const enrollCustomerSchema = z.object({
  customerId: z.string().cuid(),
  programId: z.string().cuid().optional(), // defaults to active program
});

export const earnPointsSchema = z.object({
  customerId: z.string().cuid(),
  points: decimalPos.optional(),
  orderAmount: decimalPos.optional(), // auto-calc points from amount
  referenceType: z.string().max(50).optional().nullable(),
  referenceId: z.string().optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export const redeemPointsSchema = z.object({
  customerId: z.string().cuid(),
  points: decimalPos,
  referenceType: z.string().max(50).optional().nullable(),
  referenceId: z.string().optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export const adjustPointsSchema = z.object({
  customerId: z.string().cuid(),
  points: z
    .union([z.string(), z.number()])
    .transform((v) => String(v))
    .refine((v) => !isNaN(Number(v)) && Number(v) !== 0, "Must be non-zero"),
  note: z.string().max(500).optional().nullable(),
});

export const listAccountsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  programId: z.string().cuid().optional(),
  search: z.string().max(100).optional(),
});

export const idParamSchema = z.object({ id: z.string().cuid() });

export type CreateProgramInput = z.infer<typeof createProgramSchema>;
export type UpdateProgramInput = z.infer<typeof updateProgramSchema>;
export type EnrollCustomerInput = z.infer<typeof enrollCustomerSchema>;
export type EarnPointsInput = z.infer<typeof earnPointsSchema>;
export type RedeemPointsInput = z.infer<typeof redeemPointsSchema>;
export type AdjustPointsInput = z.infer<typeof adjustPointsSchema>;
export type ListAccountsQuery = z.infer<typeof listAccountsQuerySchema>;
