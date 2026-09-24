import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(255).optional(),
  scope: z.enum(["SYSTEM", "ORGANIZATION", "BRANCH"]).default("ORGANIZATION"),
  permissionIds: z.array(z.string().cuid()).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(255).optional(),
  scope: z.enum(["SYSTEM", "ORGANIZATION", "BRANCH"]).optional(),
  permissionIds: z.array(z.string().cuid()).optional(),
});

export const roleIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const assignPermissionsSchema = z.object({
  permissionIds: z.array(z.string().cuid()).min(1),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type AssignPermissionsInput = z.infer<typeof assignPermissionsSchema>;
