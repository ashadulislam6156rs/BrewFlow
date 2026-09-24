import { z } from "zod";

const decimalNonNeg = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Must be non-negative");

const decimalPos = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Must be positive");

const orderItemSchema = z.object({
  productId: z.string().cuid(),
  variantId: z.string().cuid().optional().nullable(),
  quantity: decimalPos,
  unitPrice: decimalNonNeg.optional(),
  discount: decimalNonNeg.optional(),
  tax: decimalNonNeg.optional(),
  note: z.string().max(500).optional().nullable(),
  modifiers: z
    .array(
      z.object({
        modifierId: z.string().cuid(),
        quantity: decimalPos.optional(),
        unitPrice: decimalNonNeg.optional(),
      })
    )
    .optional(),
});

export const createOrderSchema = z.object({
  branchId: z.string().cuid(),
  customerId: z.string().cuid().optional().nullable(),
  customerAddressId: z.string().cuid().optional().nullable(),
  tableId: z.string().cuid().optional().nullable(),
  orderType: z.enum(["DINE_IN", "TAKEAWAY", "PICKUP", "DELIVERY", "QR_ORDER"]),
  channel: z
    .enum(["POS", "WEBSITE", "MOBILE", "ADMIN", "QR", "PHONE"])
    .optional(),
  cartToken: z.string().optional(), // create from cart
  discount: decimalNonNeg.optional(),
  tax: decimalNonNeg.optional(),
  serviceCharge: decimalNonNeg.optional(),
  deliveryFee: decimalNonNeg.optional(),
  notes: z.string().max(1000).optional().nullable(),
  items: z.array(orderItemSchema).min(1).optional(), // required if no cartToken
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "COMPLETED",
    "CANCELLED",
    "REJECTED",
  ]),
  note: z.string().max(500).optional().nullable(),
});

export const addPaymentSchema = z.object({
  paymentMethod: z.enum([
    "CASH",
    "CARD",
    "BKASH",
    "NAGAD",
    "ROCKET",
    "BANK_TRANSFER",
    "MOBILE_BANKING",
    "ONLINE_PAYMENT",
    "CREDIT",
    "OTHER",
  ]),
  amount: decimalPos,
  transactionId: z.string().max(100).optional().nullable(),
  provider: z.string().max(50).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export const createRefundSchema = z.object({
  amount: decimalPos,
  reason: z.string().max(1000).optional().nullable(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().cuid(),
        quantity: decimalPos,
        amount: decimalPos,
      })
    )
    .optional(),
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  orderType: z.string().optional(),
  branchId: z.string().cuid().optional(),
  customerId: z.string().cuid().optional(),
  search: z.string().max(100).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const orderIdParamSchema = z.object({ id: z.string().cuid() });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type AddPaymentInput = z.infer<typeof addPaymentSchema>;
export type CreateRefundInput = z.infer<typeof createRefundSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
