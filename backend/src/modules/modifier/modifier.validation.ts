import { z } from "zod";

const decimalString = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Must be a non-negative number");

export const createModifierGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  minSelection: z.number().int().min(0).optional(),
  maxSelection: z.number().int().min(1).optional(),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  modifiers: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        price: decimalString.optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().min(0).optional(),
      })
    )
    .optional(),
});

export const updateModifierGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  minSelection: z.number().int().min(0).optional(),
  maxSelection: z.number().int().min(1).optional(),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const createModifierSchema = z.object({
  name: z.string().min(1).max(100),
  price: decimalString.optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const updateModifierSchema = createModifierSchema.partial();

export const listModifierGroupsQuerySchema = z.object({
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  search: z.string().max(100).optional(),
});

export const modifierGroupIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const modifierIdParamSchema = z.object({
  id: z.string().cuid(),
});

export type CreateModifierGroupInput = z.infer<typeof createModifierGroupSchema>;
export type UpdateModifierGroupInput = z.infer<typeof updateModifierGroupSchema>;
export type CreateModifierInput = z.infer<typeof createModifierSchema>;
export type UpdateModifierInput = z.infer<typeof updateModifierSchema>;
export type ListModifierGroupsQuery = z.infer<typeof listModifierGroupsQuerySchema>;
