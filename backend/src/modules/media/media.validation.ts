import { z } from "zod";

export const registerAssetSchema = z.object({
  publicId: z.string().min(1).max(500),
  secureUrl: z.string().url().max(2000),
  url: z.string().url().max(2000).optional().nullable(),
  resourceType: z.enum(["IMAGE", "VIDEO", "RAW"]).optional(),
  deliveryType: z
    .enum(["UPLOAD", "FETCH", "PRIVATE", "AUTHENTICATED"])
    .optional(),
  format: z.string().max(20).optional().nullable(),
  folder: z.string().max(200).optional().nullable(),
  version: z.number().int().optional().nullable(),
  originalFilename: z.string().max(255).optional().nullable(),
  bytes: z.number().int().min(0).optional().nullable(),
  width: z.number().int().min(0).optional().nullable(),
  height: z.number().int().min(0).optional().nullable(),
  duration: z.number().min(0).optional().nullable(),
  etag: z.string().max(100).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  context: z.record(z.unknown()).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export const updateAssetSchema = z.object({
  tags: z.array(z.string()).optional().nullable(),
  context: z.record(z.unknown()).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  status: z.enum(["ACTIVE", "PENDING_DELETE", "DELETED", "FAILED"]).optional(),
});

export const listAssetsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  resourceType: z.enum(["IMAGE", "VIDEO", "RAW"]).optional(),
  status: z.enum(["ACTIVE", "PENDING_DELETE", "DELETED", "FAILED"]).optional(),
  folder: z.string().max(200).optional(),
  search: z.string().max(100).optional(),
});

export const idParamSchema = z.object({ id: z.string().cuid() });

export type RegisterAssetInput = z.infer<typeof registerAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type ListAssetsQuery = z.infer<typeof listAssetsQuerySchema>;
