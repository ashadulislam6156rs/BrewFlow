import { z } from "zod";

const decimalNonNeg = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, "Must be non-negative");

const decimalPos = z
  .union([z.string(), z.number()])
  .transform((v) => String(v))
  .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Must be positive");

// Chart of Accounts
export const createAccountSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(150),
  description: z.string().max(500).optional().nullable(),
  type: z.enum([
    "ASSET",
    "LIABILITY",
    "EQUITY",
    "REVENUE",
    "EXPENSE",
    "COST_OF_GOODS_SOLD",
  ]),
  normalBalance: z.enum(["DEBIT", "CREDIT"]),
  parentId: z.string().cuid().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateAccountSchema = createAccountSchema.partial();

// Accounting Period
export const createPeriodSchema = z.object({
  name: z.string().min(1).max(50),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const updatePeriodStatusSchema = z.object({
  status: z.enum(["OPEN", "CLOSED", "LOCKED"]),
});

// Journal Entry
const journalLineSchema = z.object({
  accountId: z.string().cuid(),
  description: z.string().max(500).optional().nullable(),
  debit: decimalNonNeg.optional(),
  credit: decimalNonNeg.optional(),
  branchId: z.string().cuid().optional().nullable(),
  customerId: z.string().cuid().optional().nullable(),
  supplierId: z.string().cuid().optional().nullable(),
});

export const createJournalSchema = z.object({
  periodId: z.string().cuid(),
  branchId: z.string().cuid().optional().nullable(),
  entryDate: z.coerce.date().optional(),
  sourceType: z
    .enum([
      "MANUAL",
      "SALE",
      "SALE_RETURN",
      "PURCHASE",
      "PURCHASE_RETURN",
      "EXPENSE",
      "PAYMENT",
      "ADJUSTMENT",
    ])
    .optional(),
  sourceId: z.string().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  lines: z.array(journalLineSchema).min(2),
});

// Sales Invoice
export const createInvoiceFromOrderSchema = z.object({
  orderId: z.string().cuid(),
  dueDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateInvoiceStatusSchema = z.object({
  status: z.enum([
    "DRAFT",
    "ISSUED",
    "PARTIALLY_PAID",
    "PAID",
    "OVERDUE",
    "CANCELLED",
  ]),
});

// Supplier Bill
export const createSupplierBillSchema = z.object({
  supplierId: z.string().cuid(),
  branchId: z.string().cuid().optional().nullable(),
  billNo: z.string().min(1).max(50).optional(),
  billDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  items: z
    .array(
      z.object({
        description: z.string().min(1).max(200),
        quantity: decimalPos,
        unitPrice: decimalNonNeg,
        tax: decimalNonNeg.optional(),
      })
    )
    .min(1),
});

export const updateBillStatusSchema = z.object({
  status: z.enum([
    "DRAFT",
    "RECEIVED",
    "PARTIALLY_PAID",
    "PAID",
    "OVERDUE",
    "CANCELLED",
  ]),
});

// Expense Category
export const createExpenseCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
});

export const updateExpenseCategorySchema = createExpenseCategorySchema.partial();

// Expense
export const createExpenseSchema = z.object({
  branchId: z.string().cuid(),
  categoryId: z.string().cuid(),
  amount: decimalPos,
  expenseDate: z.coerce.date().optional(),
  description: z.string().max(2000).optional().nullable(),
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
});

export const updateExpenseStatusSchema = z.object({
  status: z.enum([
    "DRAFT",
    "SUBMITTED",
    "APPROVED",
    "REJECTED",
    "PAID",
    "CANCELLED",
  ]),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  branchId: z.string().cuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const idParamSchema = z.object({ id: z.string().cuid() });

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type CreatePeriodInput = z.infer<typeof createPeriodSchema>;
export type UpdatePeriodStatusInput = z.infer<typeof updatePeriodStatusSchema>;
export type CreateJournalInput = z.infer<typeof createJournalSchema>;
export type CreateInvoiceFromOrderInput = z.infer<typeof createInvoiceFromOrderSchema>;
export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusSchema>;
export type CreateSupplierBillInput = z.infer<typeof createSupplierBillSchema>;
export type UpdateBillStatusInput = z.infer<typeof updateBillStatusSchema>;
export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategorySchema>;
export type UpdateExpenseCategoryInput = z.infer<typeof updateExpenseCategorySchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseStatusInput = z.infer<typeof updateExpenseStatusSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
