import { z } from "zod";

export const createUnitSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9_]+$/, "Code must be uppercase letters, numbers or underscore"),
  name: z.string().min(1).max(50),
  symbol: z.string().max(10).optional(),
  decimalPlaces: z.number().int().min(0).max(6).optional(),
});

export const updateUnitSchema = createUnitSchema.partial().omit({ code: true });

export const createUnitConversionSchema = z.object({
  fromUnitId: z.string().cuid(),
  toUnitId: z.string().cuid(),
  multiplier: z.number().positive(),
});

export const updateUnitConversionSchema = z.object({
  multiplier: z.number().positive(),
});

export const unitIdParamSchema = z.object({
  id: z.string().cuid(),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
export type CreateUnitConversionInput = z.infer<typeof createUnitConversionSchema>;
export type UpdateUnitConversionInput = z.infer<typeof updateUnitConversionSchema>;
