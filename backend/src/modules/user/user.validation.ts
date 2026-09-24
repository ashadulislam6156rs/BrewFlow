import { z } from "zod";

export const createUserSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50).optional(),
  email: z.string().email().toLowerCase(),
  phone: z.string().min(10).max(20).optional(),
  password: z
    .string()
    .min(8)
    .max(100)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  roleIds: z.array(z.string().cuid()).optional(),
  branchIds: z.array(z.string().cuid()).optional(),
  primaryBranchId: z.string().cuid().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional().nullable(),
  phone: z.string().min(10).max(20).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  roleIds: z.array(z.string().cuid()).optional(),
  branchIds: z.array(z.string().cuid()).optional(),
  primaryBranchId: z.string().cuid().optional().nullable(),
});

export const userIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]).optional(),
  search: z.string().max(100).optional(),
  branchId: z.string().cuid().optional(),
  roleId: z.string().cuid().optional(),
});

export const assignRolesSchema = z.object({
  roleIds: z.array(z.string().cuid()).min(1),
});

export const assignBranchesSchema = z.object({
  branchIds: z.array(z.string().cuid()).min(1),
  primaryBranchId: z.string().cuid().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type AssignRolesInput = z.infer<typeof assignRolesSchema>;
export type AssignBranchesInput = z.infer<typeof assignBranchesSchema>;
