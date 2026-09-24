import { z } from "zod";

export const createStationSchema = z.object({
  branchId: z.string().cuid(),
  name: z.string().min(1).max(100),
  code: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, "Code must be uppercase letters, numbers, _ or -"),
  isActive: z.boolean().optional(),
});

export const updateStationSchema = createStationSchema
  .partial()
  .omit({ branchId: true });

export const listStationsQuerySchema = z.object({
  branchId: z.string().cuid().optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export const createTicketSchema = z.object({
  orderId: z.string().cuid(),
  stationId: z.string().cuid(),
  orderItemIds: z.array(z.string().cuid()).min(1),
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(["QUEUED", "ACCEPTED", "PREPARING", "READY", "COMPLETED", "CANCELLED"]),
});

export const updateTicketItemStatusSchema = z.object({
  status: z.enum(["PENDING", "PREPARING", "READY", "SERVED", "CANCELLED"]),
});

export const listTicketsQuerySchema = z.object({
  stationId: z.string().cuid().optional(),
  branchId: z.string().cuid().optional(),
  status: z
    .enum(["QUEUED", "ACCEPTED", "PREPARING", "READY", "COMPLETED", "CANCELLED"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const idParamSchema = z.object({ id: z.string().cuid() });

export type CreateStationInput = z.infer<typeof createStationSchema>;
export type UpdateStationInput = z.infer<typeof updateStationSchema>;
export type ListStationsQuery = z.infer<typeof listStationsQuerySchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
export type UpdateTicketItemStatusInput = z.infer<typeof updateTicketItemStatusSchema>;
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
