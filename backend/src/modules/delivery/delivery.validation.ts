import { z } from "zod";

const decimalNonNeg = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Must be non-negative");

export const createDeliveryZoneSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  branchId: z.string().cuid().optional().nullable(),
  deliveryFee: decimalNonNeg.optional(),
  minimumOrder: decimalNonNeg.optional(),
  estimatedMin: z.number().int().min(0).optional().nullable(),
  estimatedMax: z.number().int().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateDeliveryZoneSchema = createDeliveryZoneSchema.partial();

export const createRiderSchema = z.object({
  userId: z.string().cuid(),
  riderCode: z.string().min(1).max(50).optional(),
  vehicleType: z.string().max(50).optional().nullable(),
  vehicleNo: z.string().max(50).optional().nullable(),
  status: z.enum(["AVAILABLE", "BUSY", "OFFLINE", "SUSPENDED"]).optional(),
});

export const updateRiderSchema = z.object({
  vehicleType: z.string().max(50).optional().nullable(),
  vehicleNo: z.string().max(50).optional().nullable(),
  status: z.enum(["AVAILABLE", "BUSY", "OFFLINE", "SUSPENDED"]).optional(),
});

export const assignDeliverySchema = z.object({
  riderId: z.string().cuid(),
  note: z.string().max(500).optional().nullable(),
});

export const updateDeliveryStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "ASSIGNED",
    "PICKED_UP",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "FAILED",
    "CANCELLED",
  ]),
  failureReason: z.string().max(500).optional().nullable(),
});

export const idParamSchema = z.object({ id: z.string().cuid() });

export type CreateDeliveryZoneInput = z.infer<typeof createDeliveryZoneSchema>;
export type UpdateDeliveryZoneInput = z.infer<typeof updateDeliveryZoneSchema>;
export type CreateRiderInput = z.infer<typeof createRiderSchema>;
export type UpdateRiderInput = z.infer<typeof updateRiderSchema>;
export type AssignDeliveryInput = z.infer<typeof assignDeliverySchema>;
export type UpdateDeliveryStatusInput = z.infer<typeof updateDeliveryStatusSchema>;
