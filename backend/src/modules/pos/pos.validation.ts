import { z } from "zod";

const decimalNonNeg = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Must be non-negative");

const decimalPos = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Must be positive");

export const createDeviceSchema = z.object({
  branchId: z.string().cuid(),
  name: z.string().min(1).max(100),
  deviceCode: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[A-Z0-9_-]+$/, "Device code must be uppercase letters, numbers, _ or -"),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]).optional(),
});

export const updateDeviceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]).optional(),
});

export const listDevicesQuerySchema = z.object({
  branchId: z.string().cuid().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]).optional(),
});

export const openShiftSchema = z.object({
  branchId: z.string().cuid(),
  deviceId: z.string().cuid().optional().nullable(),
  openingCash: decimalNonNeg.optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export const closeShiftSchema = z.object({
  closingCash: decimalNonNeg,
  notes: z.string().max(1000).optional().nullable(),
  force: z.boolean().optional(),
});

export const createCashTransactionSchema = z.object({
  type: z.enum(["CASH_IN", "CASH_OUT", "EXPENSE", "REFUND", "ADJUSTMENT"]),
  amount: decimalPos,
  reason: z.string().max(500).optional().nullable(),
  referenceType: z.string().max(50).optional().nullable(),
  referenceId: z.string().optional().nullable(),
});

export const listShiftsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  branchId: z.string().cuid().optional(),
  status: z.enum(["OPEN", "CLOSED", "FORCE_CLOSED"]).optional(),
  deviceId: z.string().cuid().optional(),
});

export const idParamSchema = z.object({ id: z.string().cuid() });

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
export type ListDevicesQuery = z.infer<typeof listDevicesQuerySchema>;
export type OpenShiftInput = z.infer<typeof openShiftSchema>;
export type CloseShiftInput = z.infer<typeof closeShiftSchema>;
export type CreateCashTransactionInput = z.infer<typeof createCashTransactionSchema>;
export type ListShiftsQuery = z.infer<typeof listShiftsQuerySchema>;
