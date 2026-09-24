import { z } from "zod";

export const createReviewSchema = z.object({
  productId: z.string().cuid(),
  customerId: z.string().cuid(),
  orderId: z.string().cuid().optional().nullable(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(150).optional().nullable(),
  comment: z.string().max(2000).optional().nullable(),
});

export const updateReviewStatusSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
});

export const listReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  productId: z.string().cuid().optional(),
  customerId: z.string().cuid().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  minRating: z.coerce.number().int().min(1).max(5).optional(),
});

export const idParamSchema = z.object({ id: z.string().cuid() });

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewStatusInput = z.infer<typeof updateReviewStatusSchema>;
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
