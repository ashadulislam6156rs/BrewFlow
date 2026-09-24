import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers and hyphens"),
  legalName: z.string().max(150).optional(),
  description: z.string().max(2000).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(20).optional(),
  website: z.string().url().optional().or(z.literal("")),
  currency: z.string().length(3).optional(),
  timezone: z.string().max(50).optional(),
  locale: z.string().max(20).optional(),
  taxNumber: z.string().max(50).optional(),
  vatNumber: z.string().max(50).optional(),
});

export const updateOrganizationSchema = createOrganizationSchema.partial().omit({ slug: true });

export const organizationIdParamSchema = z.object({
  id: z.string().cuid(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
