import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  ConflictError,
} from "../../utils/AppError.js";
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
  ListSuppliersQuery,
} from "./supplier.validation.js";
import { Prisma } from "@prisma/client";

export class SupplierService {
  async create(organizationId: string, input: CreateSupplierInput) {
    const existing = await prisma.supplier.findUnique({
      where: {
        organizationId_supplierCode: {
          organizationId,
          supplierCode: input.supplierCode,
        },
      },
    });
    if (existing) throw new ConflictError("Supplier code already exists");

    return prisma.supplier.create({
      data: {
        organizationId,
        supplierCode: input.supplierCode,
        name: input.name,
        contactPerson: input.contactPerson,
        phone: input.phone,
        email: input.email,
        address: input.address,
        taxNumber: input.taxNumber,
        vatNumber: input.vatNumber,
        openingBalance: input.openingBalance ?? 0,
        creditLimit: input.creditLimit,
        paymentTerms: input.paymentTerms,
        status: input.status ?? "ACTIVE",
      },
    });
  }

  async list(organizationId: string, query: ListSuppliersQuery) {
    const { page, limit, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = {
      organizationId,
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { supplierCode: { contains: search } },
          { phone: { contains: search } },
          { email: { contains: search } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { purchaseOrders: true, goodsReceipts: true },
          },
        },
      }),
      prisma.supplier.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getById(organizationId: string, id: string) {
    const supplier = await prisma.supplier.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: {
            purchaseOrders: true,
            goodsReceipts: true,
            bills: true,
          },
        },
      },
    });
    if (!supplier) throw new NotFoundError("Supplier not found");
    return supplier;
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateSupplierInput
  ) {
    const supplier = await prisma.supplier.findFirst({
      where: { id, organizationId },
    });
    if (!supplier) throw new NotFoundError("Supplier not found");

    if (input.supplierCode && input.supplierCode !== supplier.supplierCode) {
      const conflict = await prisma.supplier.findUnique({
        where: {
          organizationId_supplierCode: {
            organizationId,
            supplierCode: input.supplierCode,
          },
        },
      });
      if (conflict) throw new ConflictError("Supplier code already exists");
    }

    return prisma.supplier.update({
      where: { id },
      data: input,
    });
  }

  async delete(organizationId: string, id: string) {
    const supplier = await prisma.supplier.findFirst({
      where: { id, organizationId },
      include: {
        _count: { select: { purchaseOrders: true, goodsReceipts: true } },
      },
    });
    if (!supplier) throw new NotFoundError("Supplier not found");

    if (
      supplier._count.purchaseOrders > 0 ||
      supplier._count.goodsReceipts > 0
    ) {
      return prisma.supplier.update({
        where: { id },
        data: { status: "INACTIVE" },
      });
    }

    await prisma.supplier.delete({ where: { id } });
    return { id, deleted: true };
  }
}

export const supplierService = new SupplierService();
