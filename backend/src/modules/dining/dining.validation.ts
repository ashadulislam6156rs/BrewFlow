import { z } from "zod";

export const createTableSchema = z.object({
  branchId: z.string().cuid(),
  tableNumber: z.string().min(1).max(20),
  name: z.string().max(50).optional().nullable(),
  capacity: z.number().int().min(1).max(100),
  status: z
    .enum(["AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING", "OUT_OF_SERVICE"])
    .optional(),
});

export const updateTableSchema = createTableSchema.partial().omit({ branchId: true });

export const createReservationSchema = z.object({
  branchId: z.string().cuid(),
  customerId: z.string().cuid().optional().nullable(),
  tableId: z.string().cuid().optional().nullable(),
  guestName: z.string().min(1).max(100),
  guestPhone: z.string().max(20).optional().nullable(),
  guestEmail: z.string().email().optional().nullable(),
  guestCount: z.number().int().min(1).max(100),
  reservationAt: z.coerce.date(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateReservationSchema = z.object({
  tableId: z.string().cuid().optional().nullable(),
  guestName: z.string().min(1).max(100).optional(),
  guestPhone: z.string().max(20).optional().nullable(),
  guestEmail: z.string().email().optional().nullable(),
  guestCount: z.number().int().min(1).max(100).optional(),
  reservationAt: z.coerce.date().optional(),
  status: z
    .enum(["PENDING", "CONFIRMED", "SEATED", "COMPLETED", "CANCELLED", "NO_SHOW"])
    .optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export const listTablesQuerySchema = z.object({
  branchId: z.string().cuid().optional(),
  status: z
    .enum(["AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING", "OUT_OF_SERVICE"])
    .optional(),
});

export const listReservationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  branchId: z.string().cuid().optional(),
  status: z
    .enum(["PENDING", "CONFIRMED", "SEATED", "COMPLETED", "CANCELLED", "NO_SHOW"])
    .optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const idParamSchema = z.object({ id: z.string().cuid() });

export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type UpdateReservationInput = z.infer<typeof updateReservationSchema>;
export type ListTablesQuery = z.infer<typeof listTablesQuerySchema>;
export type ListReservationsQuery = z.infer<typeof listReservationsQuerySchema>;
