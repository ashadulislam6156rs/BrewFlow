import { z } from "zod";

export const createNotificationSchema = z.object({
  userId: z.string().cuid().optional().nullable(),
  type: z.enum([
    "ORDER",
    "PAYMENT",
    "DELIVERY",
    "INVENTORY",
    "SYSTEM",
    "PROMOTION",
  ]),
  channel: z
    .enum(["IN_APP", "EMAIL", "SMS", "WHATSAPP", "PUSH"])
    .optional(),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  referenceType: z.string().max(50).optional().nullable(),
  referenceId: z.string().optional().nullable(),
});

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["PENDING", "SENT", "FAILED", "READ"]).optional(),
  type: z
    .enum(["ORDER", "PAYMENT", "DELIVERY", "INVENTORY", "SYSTEM", "PROMOTION"])
    .optional(),
  unreadOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const idParamSchema = z.object({ id: z.string().cuid() });

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
