import { z } from "zod";

export const createPermissionSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9_.:-]+$/, "Code can only contain lowercase letters, numbers, underscore, dot, colon and hyphen"),
  name: z.string().min(2).max(100),
  description: z.string().max(255).optional(),
  module: z.string().max(50).optional(),
});

export const listPermissionsQuerySchema = z.object({
  module: z.string().max(50).optional(),
  search: z.string().max(100).optional(),
});

export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
export type ListPermissionsQuery = z.infer<typeof listPermissionsQuerySchema>;
