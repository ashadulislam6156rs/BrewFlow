import { z } from "zod";

export const createBranchSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, "Code can only contain uppercase letters, numbers, underscore and hyphen"),
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers and hyphens"),
  description: z.string().max(2000).optional(),
  address: z.string().max(500).optional(),
  area: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  phone: z.string().min(10).max(20).optional(),
  email: z.string().email().optional(),
  openingTime: z.string().max(10).optional(), // e.g. "09:00"
  closingTime: z.string().max(10).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "CLOSED"]).optional(),
});

export const updateBranchSchema = createBranchSchema.partial();

export const branchIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const listBranchesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["ACTIVE", "INACTIVE", "CLOSED"]).optional(),
  search: z.string().max(100).optional(),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
export type ListBranchesQuery = z.infer<typeof listBranchesQuerySchema>;
