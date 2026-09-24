import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../../utils/AppError.js";
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
import { Prisma } from "@prisma/client";

function genNo(prefix: string) {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${date}-${rand}`;
}

export class AccountingService {
  // ═══════════════════════════════════════════════════════════
  // Chart of Accounts
  // ═══════════════════════════════════════════════════════════
  async createAccount(organizationId: string, input: CreateAccountInput) {
    const existing = await prisma.chartOfAccount.findUnique({
      where: {
        organizationId_code: { organizationId, code: input.code },
      },
    });
    if (existing) throw new ConflictError("Account code already exists");

    if (input.parentId) {
      const parent = await prisma.chartOfAccount.findFirst({
        where: { id: input.parentId, organizationId },
      });
      if (!parent) throw new BadRequestError("Parent account not found");
    }

    return prisma.chartOfAccount.create({
      data: {
        organizationId,
        code: input.code,
        name: input.name,
        description: input.description,
        type: input.type,
        normalBalance: input.normalBalance,
        parentId: input.parentId,
        isActive: input.isActive ?? true,
      },
      include: {
        parent: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async listAccounts(organizationId: string, query: ListQuery) {
    const where: Prisma.ChartOfAccountWhereInput = {
      organizationId,
      ...(query.type && { type: query.type as any }),
      ...(query.search && {
        OR: [
          { code: { contains: query.search } },
          { name: { contains: query.search } },
        ],
      }),
    };

    return prisma.chartOfAccount.findMany({
      where,
      include: {
        parent: { select: { id: true, code: true, name: true } },
        children: {
          select: { id: true, code: true, name: true, type: true },
        },
      },
      orderBy: { code: "asc" },
    });
  }

  async updateAccount(
    organizationId: string,
    id: string,
    input: UpdateAccountInput
  ) {
    const account = await prisma.chartOfAccount.findFirst({
      where: { id, organizationId },
    });
    if (!account) throw new NotFoundError("Account not found");
    if (account.isSystem) {
      throw new BadRequestError("Cannot modify system account");
    }

    if (input.code && input.code !== account.code) {
      const conflict = await prisma.chartOfAccount.findUnique({
        where: {
          organizationId_code: { organizationId, code: input.code },
        },
      });
      if (conflict) throw new ConflictError("Account code already exists");
    }

    return prisma.chartOfAccount.update({
      where: { id },
      data: input,
      include: {
        parent: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async deleteAccount(organizationId: string, id: string) {
    const account = await prisma.chartOfAccount.findFirst({
      where: { id, organizationId },
      include: {
        _count: { select: { journalLines: true, children: true } },
      },
    });
    if (!account) throw new NotFoundError("Account not found");
    if (account.isSystem) throw new BadRequestError("Cannot delete system account");
    if (account._count.journalLines > 0) {
      return prisma.chartOfAccount.update({
        where: { id },
        data: { isActive: false },
      });
    }
    if (account._count.children > 0) {
      throw new BadRequestError("Account has child accounts");
    }

    await prisma.chartOfAccount.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ═══════════════════════════════════════════════════════════
  // Accounting Period
  // ═══════════════════════════════════════════════════════════
  async createPeriod(organizationId: string, input: CreatePeriodInput) {
    if (input.endDate <= input.startDate) {
      throw new BadRequestError("End date must be after start date");
    }

    const existing = await prisma.accountingPeriod.findUnique({
      where: {
        organizationId_name: { organizationId, name: input.name },
      },
    });
    if (existing) throw new ConflictError("Period name already exists");

    return prisma.accountingPeriod.create({
      data: {
        organizationId,
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        status: "OPEN",
      },
    });
  }

  async listPeriods(organizationId: string) {
    return prisma.accountingPeriod.findMany({
      where: { organizationId },
      orderBy: { startDate: "desc" },
      include: {
        _count: { select: { journalEntries: true } },
      },
    });
  }

  async updatePeriodStatus(
    organizationId: string,
    id: string,
    input: UpdatePeriodStatusInput
  ) {
    const period = await prisma.accountingPeriod.findFirst({
      where: { id, organizationId },
    });
    if (!period) throw new NotFoundError("Accounting period not found");
    if (period.status === "LOCKED" && input.status !== "LOCKED") {
      throw new BadRequestError("Cannot reopen a locked period");
    }

    return prisma.accountingPeriod.update({
      where: { id },
      data: { status: input.status },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Journal Entry
  // ═══════════════════════════════════════════════════════════
  async createJournal(
    organizationId: string,
    userId: string,
    input: CreateJournalInput
  ) {
    const period = await prisma.accountingPeriod.findFirst({
      where: { id: input.periodId, organizationId, status: "OPEN" },
    });
    if (!period) {
      throw new BadRequestError("Open accounting period not found");
    }

    let totalDebit = 0;
    let totalCredit = 0;
    for (const line of input.lines) {
      const d = Number(line.debit ?? 0);
      const c = Number(line.credit ?? 0);
      if (d > 0 && c > 0) {
        throw new BadRequestError("A line cannot have both debit and credit");
      }
      if (d === 0 && c === 0) {
        throw new BadRequestError("A line must have debit or credit");
      }
      totalDebit += d;
      totalCredit += c;

      const account = await prisma.chartOfAccount.findFirst({
        where: { id: line.accountId, organizationId, isActive: true },
      });
      if (!account) {
        throw new BadRequestError(`Account ${line.accountId} not found`);
      }
    }

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new BadRequestError(
        `Journal is not balanced. Debit: ${totalDebit}, Credit: ${totalCredit}`
      );
    }

    const entry = await prisma.$transaction(async (tx) => {
      const created = await tx.journalEntry.create({
        data: {
          organizationId,
          branchId: input.branchId,
          periodId: input.periodId,
          entryNo: genNo("JE"),
          entryDate: input.entryDate ?? new Date(),
          sourceType: input.sourceType ?? "MANUAL",
          sourceId: input.sourceId,
          description: input.description,
          status: "DRAFT",
          createdById: userId,
        },
      });

      await tx.journalLine.createMany({
        data: input.lines.map((l) => ({
          journalEntryId: created.id,
          accountId: l.accountId,
          branchId: l.branchId,
          customerId: l.customerId,
          supplierId: l.supplierId,
          description: l.description,
          debit: l.debit ?? 0,
          credit: l.credit ?? 0,
        })),
      });

      return created;
    });

    return this.getJournal(organizationId, entry.id);
  }

  async postJournal(organizationId: string, id: string) {
    const entry = await prisma.journalEntry.findFirst({
      where: { id, organizationId },
      include: { period: true, lines: true },
    });
    if (!entry) throw new NotFoundError("Journal entry not found");
    if (entry.status !== "DRAFT") {
      throw new BadRequestError(`Cannot post ${entry.status} entry`);
    }
    if (entry.period.status !== "OPEN") {
      throw new BadRequestError("Accounting period is not open");
    }

    return prisma.journalEntry.update({
      where: { id },
      data: { status: "POSTED" },
      include: {
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true } },
          },
        },
        period: { select: { id: true, name: true } },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async voidJournal(organizationId: string, id: string) {
    const entry = await prisma.journalEntry.findFirst({
      where: { id, organizationId },
    });
    if (!entry) throw new NotFoundError("Journal entry not found");
    if (entry.status === "VOID") {
      throw new BadRequestError("Entry already voided");
    }

    return prisma.journalEntry.update({
      where: { id },
      data: { status: "VOID" },
    });
  }

  async listJournals(organizationId: string, query: ListQuery) {
    const { page, limit, status, branchId, from, to, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.JournalEntryWhereInput = {
      organizationId,
      ...(status && { status: status as any }),
      ...(branchId && { branchId }),
      ...(search && {
        OR: [
          { entryNo: { contains: search } },
          { description: { contains: search } },
        ],
      }),
      ...(from || to
        ? {
            entryDate: {
              ...(from && { gte: from }),
              ...(to && { lte: to }),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { entryDate: "desc" },
        include: {
          period: { select: { id: true, name: true } },
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: { select: { lines: true } },
        },
      }),
      prisma.journalEntry.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getJournal(organizationId: string, id: string) {
    const entry = await prisma.journalEntry.findFirst({
      where: { id, organizationId },
      include: {
        period: { select: { id: true, name: true, status: true } },
        branch: { select: { id: true, name: true } },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        lines: {
          include: {
            account: {
              select: { id: true, code: true, name: true, type: true },
            },
          },
        },
      },
    });
    if (!entry) throw new NotFoundError("Journal entry not found");
    return entry;
  }

  // ═══════════════════════════════════════════════════════════
  // Sales Invoice
  // ═══════════════════════════════════════════════════════════
  async createInvoiceFromOrder(
    organizationId: string,
    input: CreateInvoiceFromOrderInput
  ) {
    const order = await prisma.order.findFirst({
      where: { id: input.orderId, organizationId },
      include: { items: true, invoice: true },
    });
    if (!order) throw new NotFoundError("Order not found");
    if (order.invoice) {
      throw new ConflictError("Invoice already exists for this order");
    }

    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.salesInvoice.create({
        data: {
          organizationId,
          orderId: order.id,
          customerId: order.customerId,
          invoiceNo: genNo("INV"),
          status: "ISSUED",
          invoiceDate: new Date(),
          dueDate: input.dueDate,
          subtotal: order.subtotal,
          discount: order.discount,
          tax: order.tax,
          total: order.total,
          paidAmount: order.paidAmount,
          dueAmount: order.dueAmount,
          notes: input.notes,
        },
      });

      await tx.salesInvoiceItem.createMany({
        data: order.items.map((oi) => ({
          invoiceId: created.id,
          productId: oi.productId,
          productName: oi.productName,
          quantity: oi.quantity,
          unitPrice: oi.unitPrice,
          discount: oi.discount,
          tax: oi.tax,
          total: oi.total,
        })),
      });

      // Customer ledger (debit increases receivable)
      if (order.customerId) {
        await tx.customerLedgerEntry.create({
          data: {
            organizationId,
            customerId: order.customerId,
            entryType: "INVOICE",
            debit: order.total,
            credit: 0,
            balance: order.dueAmount,
            referenceType: "SalesInvoice",
            referenceId: created.id,
            description: `Invoice ${created.invoiceNo}`,
          },
        });
      }

      return created;
    });

    return this.getInvoice(organizationId, invoice.id);
  }

  async listInvoices(organizationId: string, query: ListQuery) {
    const { page, limit, status, from, to, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SalesInvoiceWhereInput = {
      organizationId,
      ...(status && { status: status as any }),
      ...(search && { invoiceNo: { contains: search } }),
      ...(from || to
        ? {
            invoiceDate: {
              ...(from && { gte: from }),
              ...(to && { lte: to }),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.salesInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { invoiceDate: "desc" },
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          order: { select: { id: true, orderNo: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.salesInvoice.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getInvoice(organizationId: string, id: string) {
    const invoice = await prisma.salesInvoice.findFirst({
      where: { id, organizationId },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
        order: { select: { id: true, orderNo: true, status: true } },
        items: true,
      },
    });
    if (!invoice) throw new NotFoundError("Invoice not found");
    return invoice;
  }

  async updateInvoiceStatus(
    organizationId: string,
    id: string,
    input: UpdateInvoiceStatusInput
  ) {
    const invoice = await prisma.salesInvoice.findFirst({
      where: { id, organizationId },
    });
    if (!invoice) throw new NotFoundError("Invoice not found");

    return prisma.salesInvoice.update({
      where: { id },
      data: { status: input.status },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Supplier Bill
  // ═══════════════════════════════════════════════════════════
  async createSupplierBill(
    organizationId: string,
    input: CreateSupplierBillInput
  ) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: input.supplierId, organizationId },
    });
    if (!supplier) throw new BadRequestError("Supplier not found");

    let subtotal = 0;
    let taxTotal = 0;
    const items = input.items.map((i) => {
      const qty = Number(i.quantity);
      const price = Number(i.unitPrice);
      const tax = Number(i.tax ?? 0);
      const total = qty * price + tax;
      subtotal += qty * price;
      taxTotal += tax;
      return {
        description: i.description,
        quantity: qty,
        unitPrice: price,
        tax,
        total,
      };
    });
    const total = subtotal + taxTotal;

    const bill = await prisma.$transaction(async (tx) => {
      const created = await tx.supplierBill.create({
        data: {
          organizationId,
          supplierId: input.supplierId,
          billNo: input.billNo || genNo("BILL"),
          status: "DRAFT",
          billDate: input.billDate ?? new Date(),
          dueDate: input.dueDate,
          subtotal,
          tax: taxTotal,
          total,
          paidAmount: 0,
          dueAmount: total,
        },
      });

      await tx.supplierBillItem.createMany({
        data: items.map((i) => ({
          billId: created.id,
          itemName: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          tax: i.tax,
          total: i.total,
        })),
      });

      await tx.supplierLedgerEntry.create({
        data: {
          organizationId,
          supplierId: input.supplierId,
          billId: created.id,
          entryType: "INVOICE",
          debit: 0,
          credit: total,
          balance: total,
          referenceType: "SupplierBill",
          referenceId: created.id,
          description: `Bill ${created.billNo}`,
        },
      });

      return created;
    });

    return this.getSupplierBill(organizationId, bill.id);
  }

  async listSupplierBills(organizationId: string, query: ListQuery) {
    const { page, limit, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierBillWhereInput = {
      organizationId,
      ...(status && { status: status as any }),
      ...(search && { billNo: { contains: search } }),
    };

    const [items, total] = await Promise.all([
      prisma.supplierBill.findMany({
        where,
        skip,
        take: limit,
        orderBy: { billDate: "desc" },
        include: {
          supplier: { select: { id: true, name: true, code: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.supplierBill.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getSupplierBill(organizationId: string, id: string) {
    const bill = await prisma.supplierBill.findFirst({
      where: { id, organizationId },
      include: {
        supplier: true,
        items: true,
      },
    });
    if (!bill) throw new NotFoundError("Supplier bill not found");
    return bill;
  }

  async updateBillStatus(
    organizationId: string,
    id: string,
    input: UpdateBillStatusInput
  ) {
    const bill = await prisma.supplierBill.findFirst({
      where: { id, organizationId },
    });
    if (!bill) throw new NotFoundError("Supplier bill not found");

    return prisma.supplierBill.update({
      where: { id },
      data: { status: input.status },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Expense Category + Expense
  // ═══════════════════════════════════════════════════════════
  async createExpenseCategory(
    organizationId: string,
    input: CreateExpenseCategoryInput
  ) {
    const existing = await prisma.expenseCategory.findUnique({
      where: {
        organizationId_name: { organizationId, name: input.name },
      },
    });
    if (existing) throw new ConflictError("Category name already exists");

    return prisma.expenseCategory.create({
      data: {
        organizationId,
        name: input.name,
        description: input.description,
        status: input.status ?? "ACTIVE",
      },
    });
  }

  async listExpenseCategories(organizationId: string) {
    return prisma.expenseCategory.findMany({
      where: { organizationId, status: "ACTIVE" },
      orderBy: { name: "asc" },
      include: { _count: { select: { expenses: true } } },
    });
  }

  async updateExpenseCategory(
    organizationId: string,
    id: string,
    input: UpdateExpenseCategoryInput
  ) {
    const cat = await prisma.expenseCategory.findFirst({
      where: { id, organizationId },
    });
    if (!cat) throw new NotFoundError("Expense category not found");

    return prisma.expenseCategory.update({
      where: { id },
      data: input,
    });
  }

  async createExpense(
    organizationId: string,
    userId: string,
    input: CreateExpenseInput
  ) {
    const branch = await prisma.branch.findFirst({
      where: { id: input.branchId, organizationId },
    });
    if (!branch) throw new BadRequestError("Branch not found");

    const category = await prisma.expenseCategory.findFirst({
      where: { id: input.categoryId, organizationId },
    });
    if (!category) throw new BadRequestError("Expense category not found");

    return prisma.expense.create({
      data: {
        organizationId,
        branchId: input.branchId,
        categoryId: input.categoryId,
        expenseNo: genNo("EXP"),
        amount: input.amount,
        expenseDate: input.expenseDate ?? new Date(),
        description: input.description,
        paymentMethod: input.paymentMethod,
        status: "DRAFT",
        createdById: userId,
      },
      include: {
        category: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async listExpenses(organizationId: string, query: ListQuery) {
    const { page, limit, status, branchId, from, to, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = {
      organizationId,
      ...(status && { status: status as any }),
      ...(branchId && { branchId }),
      ...(search && {
        OR: [
          { expenseNo: { contains: search } },
          { description: { contains: search } },
        ],
      }),
      ...(from || to
        ? {
            expenseDate: {
              ...(from && { gte: from }),
              ...(to && { lte: to }),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expenseDate: "desc" },
        include: {
          category: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async updateExpenseStatus(
    organizationId: string,
    id: string,
    userId: string,
    input: UpdateExpenseStatusInput
  ) {
    const expense = await prisma.expense.findFirst({
      where: { id, organizationId },
    });
    if (!expense) throw new NotFoundError("Expense not found");

    const data: any = { status: input.status };
    if (input.status === "APPROVED") {
      data.approvedById = userId;
    }

    return prisma.expense.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true } },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  // ═══════════════════════════════════════════════════════════
  // Ledgers
  // ═══════════════════════════════════════════════════════════
  async customerLedger(
    organizationId: string,
    customerId: string,
    page = 1,
    limit = 50
  ) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, organizationId },
    });
    if (!customer) throw new NotFoundError("Customer not found");

    const where = { organizationId, customerId };
    const [items, total] = await Promise.all([
      prisma.customerLedgerEntry.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.customerLedgerEntry.count({ where }),
    ]);

    return { items, total, page, limit, customer };
  }

  async supplierLedger(
    organizationId: string,
    supplierId: string,
    page = 1,
    limit = 50
  ) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, organizationId },
    });
    if (!supplier) throw new NotFoundError("Supplier not found");

    const where = { organizationId, supplierId };
    const [items, total] = await Promise.all([
      prisma.supplierLedgerEntry.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.supplierLedgerEntry.count({ where }),
    ]);

    return { items, total, page, limit, supplier };
  }
}

export const accountingService = new AccountingService();
