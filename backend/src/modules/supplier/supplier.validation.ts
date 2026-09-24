import { z } from "zod";

const decimalNonNeg = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Must be non-negative");

export const createSupplierSchema = z.object({
  supplierCode: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  contactPerson: z.string().max(100).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(1000).optional().nullable(),
  taxNumber: z.string().max(50).optional().nullable(),
  vatNumber: z.string().max(50).optional().nullable(),
  openingBalance: decimalNonNeg.optional(),
  creditLimit: decimalNonNeg.optional().nullable(),
  paymentTerms: z.string().max(100).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const listSuppliersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  search: z.string().max(100).optional(),
});

export const supplierIdParamSchema = z.object({
  id: z.string().cuid(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>;
