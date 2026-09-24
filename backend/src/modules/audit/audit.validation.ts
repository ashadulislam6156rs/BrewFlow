import { z } from "zod";

export const createAuditLogSchema = z.object({
  branchId: z.string().cuid().optional().nullable(),
  action: z.string().min(1).max(100),
  entityType: z.string().min(1).max(100),
  entityId: z.string().optional().nullable(),
  oldData: z.record(z.unknown()).optional().nullable(),
  newData: z.record(z.unknown()).optional().nullable(),
  ipAddress: z.string().max(50).optional().nullable(),
  userAgent: z.string().max(500).optional().nullable(),
  requestId: z.string().max(100).optional().nullable(),
});

export const listAuditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  entityType: z.string().max(100).optional(),
  entityId: z.string().optional(),
  userId: z.string().cuid().optional(),
  action: z.string().max(100).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>;
export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;
