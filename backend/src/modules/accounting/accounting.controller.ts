import type { Request, Response } from "express";
import { accountingService } from "./accounting.service.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  CreateAccountInput,
  UpdateAccountInput,
  CreatePeriodInput,
  UpdatePeriodStatusInput,
  CreateJournalInput,
  CreateInvoiceFromOrderInput,
  UpdateInvoiceStatusInput,
  CreateSupplierBillInput,
  UpdateBillStatusInput,
  CreateExpenseCategoryInput,
  UpdateExpenseCategoryInput,
  CreateExpenseInput,
  UpdateExpenseStatusInput,
  ListQuery,
} from "./accounting.validation.js";

// Accounts
export const createAccount = asyncHandler(async (req: Request, res: Response) => {
  const result = await accountingService.createAccount(
    req.user!.organizationId,
    req.body as CreateAccountInput
  );
  return sendSuccess(res, result, "Account created", 201);
});

export const listAccounts = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListQuery;
  const result = await accountingService.listAccounts(
    req.user!.organizationId,
    query
  );
  return sendSuccess(res, result, "Accounts fetched");
});

export const updateAccount = asyncHandler(async (req: Request, res: Response) => {
  const result = await accountingService.updateAccount(
    req.user!.organizationId,
    req.params.id,
    req.body as UpdateAccountInput
  );
  return sendSuccess(res, result, "Account updated");
});

export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  const result = await accountingService.deleteAccount(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Account deleted");
});

// Periods
export const createPeriod = asyncHandler(async (req: Request, res: Response) => {
  const result = await accountingService.createPeriod(
    req.user!.organizationId,
    req.body as CreatePeriodInput
  );
  return sendSuccess(res, result, "Period created", 201);
});

export const listPeriods = asyncHandler(async (req: Request, res: Response) => {
  const result = await accountingService.listPeriods(req.user!.organizationId);
  return sendSuccess(res, result, "Periods fetched");
});

export const updatePeriodStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await accountingService.updatePeriodStatus(
      req.user!.organizationId,
      req.params.id,
      req.body as UpdatePeriodStatusInput
    );
    return sendSuccess(res, result, "Period status updated");
  }
);

// Journals
export const createJournal = asyncHandler(async (req: Request, res: Response) => {
  const result = await accountingService.createJournal(
    req.user!.organizationId,
    req.user!.userId,
    req.body as CreateJournalInput
  );
  return sendSuccess(res, result, "Journal entry created", 201);
});

export const listJournals = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListQuery;
  const { items, total, page, limit } = await accountingService.listJournals(
    req.user!.organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Journals fetched");
});

export const getJournal = asyncHandler(async (req: Request, res: Response) => {
  const result = await accountingService.getJournal(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Journal fetched");
});

export const postJournal = asyncHandler(async (req: Request, res: Response) => {
  const result = await accountingService.postJournal(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Journal posted");
});

export const voidJournal = asyncHandler(async (req: Request, res: Response) => {
  const result = await accountingService.voidJournal(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Journal voided");
});

// Invoices
export const createInvoice = asyncHandler(async (req: Request, res: Response) => {
  const result = await accountingService.createInvoiceFromOrder(
    req.user!.organizationId,
    req.body as CreateInvoiceFromOrderInput
  );
  return sendSuccess(res, result, "Invoice created", 201);
});

export const listInvoices = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListQuery;
  const { items, total, page, limit } = await accountingService.listInvoices(
    req.user!.organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Invoices fetched");
});

export const getInvoice = asyncHandler(async (req: Request, res: Response) => {
  const result = await accountingService.getInvoice(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Invoice fetched");
});

export const updateInvoiceStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await accountingService.updateInvoiceStatus(
      req.user!.organizationId,
      req.params.id,
      req.body as UpdateInvoiceStatusInput
    );
    return sendSuccess(res, result, "Invoice status updated");
  }
);

// Supplier bills
export const createSupplierBill = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await accountingService.createSupplierBill(
      req.user!.organizationId,
      req.body as CreateSupplierBillInput
    );
    return sendSuccess(res, result, "Supplier bill created", 201);
  }
);

export const listSupplierBills = asyncHandler(
  async (req: Request, res: Response) => {
    const query = req.query as unknown as ListQuery;
    const { items, total, page, limit } =
      await accountingService.listSupplierBills(
        req.user!.organizationId,
        query
      );
    return sendPaginated(res, items, total, page, limit, "Bills fetched");
  }
);

export const getSupplierBill = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await accountingService.getSupplierBill(
      req.user!.organizationId,
      req.params.id
    );
    return sendSuccess(res, result, "Bill fetched");
  }
);

export const updateBillStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await accountingService.updateBillStatus(
      req.user!.organizationId,
      req.params.id,
      req.body as UpdateBillStatusInput
    );
    return sendSuccess(res, result, "Bill status updated");
  }
);

// Expense categories
export const createExpenseCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await accountingService.createExpenseCategory(
      req.user!.organizationId,
      req.body as CreateExpenseCategoryInput
    );
    return sendSuccess(res, result, "Expense category created", 201);
  }
);

export const listExpenseCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await accountingService.listExpenseCategories(
      req.user!.organizationId
    );
    return sendSuccess(res, result, "Expense categories fetched");
  }
);

export const updateExpenseCategory = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await accountingService.updateExpenseCategory(
      req.user!.organizationId,
      req.params.id,
      req.body as UpdateExpenseCategoryInput
    );
    return sendSuccess(res, result, "Expense category updated");
  }
);

// Expenses
export const createExpense = asyncHandler(async (req: Request, res: Response) => {
  const result = await accountingService.createExpense(
    req.user!.organizationId,
    req.user!.userId,
    req.body as CreateExpenseInput
  );
  return sendSuccess(res, result, "Expense created", 201);
});

export const listExpenses = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListQuery;
  const { items, total, page, limit } = await accountingService.listExpenses(
    req.user!.organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Expenses fetched");
});

export const updateExpenseStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await accountingService.updateExpenseStatus(
      req.user!.organizationId,
      req.params.id,
      req.user!.userId,
      req.body as UpdateExpenseStatusInput
    );
    return sendSuccess(res, result, "Expense status updated");
  }
);

// Ledgers
export const customerLedger = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const { items, total, customer } = await accountingService.customerLedger(
      req.user!.organizationId,
      req.params.customerId,
      page,
      limit
    );
    return sendSuccess(res, items, "Customer ledger fetched", 200, {
      customer,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
);

export const supplierLedger = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const { items, total, supplier } = await accountingService.supplierLedger(
      req.user!.organizationId,
      req.params.supplierId,
      page,
      limit
    );
    return sendSuccess(res, items, "Supplier ledger fetched", 200, {
      supplier,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
);
