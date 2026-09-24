import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createAccount,
  listAccounts,
  updateAccount,
  deleteAccount,
  createPeriod,
  listPeriods,
  updatePeriodStatus,
  createJournal,
  listJournals,
  getJournal,
  postJournal,
  voidJournal,
  createInvoice,
  listInvoices,
  getInvoice,
  updateInvoiceStatus,
  createSupplierBill,
  listSupplierBills,
  getSupplierBill,
  updateBillStatus,
  createExpenseCategory,
  listExpenseCategories,
  updateExpenseCategory,
  createExpense,
  listExpenses,
  updateExpenseStatus,
  customerLedger,
  supplierLedger,
} from "./accounting.controller.js";
import {
  createAccountSchema,
  updateAccountSchema,
  createPeriodSchema,
  updatePeriodStatusSchema,
  createJournalSchema,
  createInvoiceFromOrderSchema,
  updateInvoiceStatusSchema,
  createSupplierBillSchema,
  updateBillStatusSchema,
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
  createExpenseSchema,
  updateExpenseStatusSchema,
  listQuerySchema,
  idParamSchema,
} from "./accounting.validation.js";
import { z } from "zod";

const router = Router();
router.use(authenticate);

const admin = authorize("Owner", "Admin");

// Chart of Accounts
router.get("/accounts", validate(listQuerySchema, "query"), listAccounts);
router.post("/accounts", admin, validate(createAccountSchema), createAccount);
router.patch(
  "/accounts/:id",
  admin,
  validate(idParamSchema, "params"),
  validate(updateAccountSchema),
  updateAccount
);
router.delete(
  "/accounts/:id",
  admin,
  validate(idParamSchema, "params"),
  deleteAccount
);

// Periods
router.get("/periods", listPeriods);
router.post("/periods", admin, validate(createPeriodSchema), createPeriod);
router.patch(
  "/periods/:id/status",
  admin,
  validate(idParamSchema, "params"),
  validate(updatePeriodStatusSchema),
  updatePeriodStatus
);

// Journals
router.get("/journals", validate(listQuerySchema, "query"), listJournals);
router.post("/journals", admin, validate(createJournalSchema), createJournal);
router.get("/journals/:id", validate(idParamSchema, "params"), getJournal);
router.post(
  "/journals/:id/post",
  admin,
  validate(idParamSchema, "params"),
  postJournal
);
router.post(
  "/journals/:id/void",
  admin,
  validate(idParamSchema, "params"),
  voidJournal
);

// Sales Invoices
router.get("/invoices", validate(listQuerySchema, "query"), listInvoices);
router.post(
  "/invoices",
  admin,
  validate(createInvoiceFromOrderSchema),
  createInvoice
);
router.get("/invoices/:id", validate(idParamSchema, "params"), getInvoice);
router.patch(
  "/invoices/:id/status",
  admin,
  validate(idParamSchema, "params"),
  validate(updateInvoiceStatusSchema),
  updateInvoiceStatus
);

// Supplier Bills
router.get("/bills", validate(listQuerySchema, "query"), listSupplierBills);
router.post(
  "/bills",
  admin,
  validate(createSupplierBillSchema),
  createSupplierBill
);
router.get("/bills/:id", validate(idParamSchema, "params"), getSupplierBill);
router.patch(
  "/bills/:id/status",
  admin,
  validate(idParamSchema, "params"),
  validate(updateBillStatusSchema),
  updateBillStatus
);

// Expense Categories
router.get("/expense-categories", listExpenseCategories);
router.post(
  "/expense-categories",
  admin,
  validate(createExpenseCategorySchema),
  createExpenseCategory
);
router.patch(
  "/expense-categories/:id",
  admin,
  validate(idParamSchema, "params"),
  validate(updateExpenseCategorySchema),
  updateExpenseCategory
);

// Expenses
router.get("/expenses", validate(listQuerySchema, "query"), listExpenses);
router.post("/expenses", admin, validate(createExpenseSchema), createExpense);
router.patch(
  "/expenses/:id/status",
  admin,
  validate(idParamSchema, "params"),
  validate(updateExpenseStatusSchema),
  updateExpenseStatus
);

// Ledgers
router.get(
  "/ledgers/customer/:customerId",
  validate(z.object({ customerId: z.string().cuid() }), "params"),
  customerLedger
);
router.get(
  "/ledgers/supplier/:supplierId",
  validate(z.object({ supplierId: z.string().cuid() }), "params"),
  supplierLedger
);

export default router;
