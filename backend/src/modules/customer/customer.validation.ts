import { z } from "zod";

const decimalNonNeg = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Must be non-negative");

export const createCustomerSchema = z.object({
  customerCode: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(200),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  billingAddress: z.string().max(1000).optional().nullable(),
  shippingAddress: z.string().max(1000).optional().nullable(),
  tin: z.string().max(50).optional().nullable(),
  bin: z.string().max(50).optional().nullable(),
  openingBalance: decimalNonNeg.optional(),
  creditLimit: decimalNonNeg.optional().nullable(),
  paymentTerms: z.string().max(100).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  search: z.string().max(100).optional(),
});

export const customerIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const createAddressSchema = z.object({
  label: z.string().max(50).optional().nullable(),
  recipientName: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  addressLine1: z.string().min(1).max(500),
  addressLine2: z.string().max(500).optional().nullable(),
  area: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  country: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  isDefault: z.boolean().optional(),
});

export const updateAddressSchema = createAddressSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
