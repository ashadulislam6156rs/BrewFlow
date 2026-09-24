import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../../utils/AppError.js";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  ListCustomersQuery,
  CreateAddressInput,
  UpdateAddressInput,
} from "./customer.validation.js";
import { Prisma } from "@prisma/client";

function genCode(prefix: string) {
  const ts = Date.now().toString(36).toUpperCase();
  return `${prefix}-${ts}`;
}

export class CustomerService {
  async create(organizationId: string, input: CreateCustomerInput) {
    const code = input.customerCode || genCode("CUS");

    const existing = await prisma.customer.findUnique({
      where: {
        organizationId_customerCode: { organizationId, customerCode: code },
      },
    });
    if (existing) throw new ConflictError("Customer code already exists");

    return prisma.customer.create({
      data: {
        organizationId,
        customerCode: code,
        name: input.name,
        phone: input.phone,
        email: input.email,
        billingAddress: input.billingAddress,
        shippingAddress: input.shippingAddress,
        tin: input.tin,
        bin: input.bin,
        openingBalance: input.openingBalance ?? 0,
        creditLimit: input.creditLimit,
        paymentTerms: input.paymentTerms,
        status: input.status ?? "ACTIVE",
      },
    });
  }

  async list(organizationId: string, query: ListCustomersQuery) {
    const { page, limit, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {
      organizationId,
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { phone: { contains: search } },
          { email: { contains: search } },
          { customerCode: { contains: search } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { orders: true, addresses: true } },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getById(organizationId: string, id: string) {
    const customer = await prisma.customer.findFirst({
      where: { id, organizationId },
      include: {
        addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
        _count: { select: { orders: true, reviews: true } },
      },
    });
    if (!customer) throw new NotFoundError("Customer not found");
    return customer;
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateCustomerInput
  ) {
    const customer = await prisma.customer.findFirst({
      where: { id, organizationId },
    });
    if (!customer) throw new NotFoundError("Customer not found");

    if (input.customerCode && input.customerCode !== customer.customerCode) {
      const conflict = await prisma.customer.findUnique({
        where: {
          organizationId_customerCode: {
            organizationId,
            customerCode: input.customerCode,
          },
        },
      });
      if (conflict) throw new ConflictError("Customer code already exists");
    }

    return prisma.customer.update({
      where: { id },
      data: input,
    });
  }

  async delete(organizationId: string, id: string) {
    const customer = await prisma.customer.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { orders: true } } },
    });
    if (!customer) throw new NotFoundError("Customer not found");

    if (customer._count.orders > 0) {
      return prisma.customer.update({
        where: { id },
        data: { status: "INACTIVE" },
      });
    }

    await prisma.customer.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ─── Addresses ───────────────────────────────────────────
  async addAddress(
    organizationId: string,
    customerId: string,
    input: CreateAddressInput
  ) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, organizationId },
    });
    if (!customer) throw new NotFoundError("Customer not found");

    if (input.isDefault) {
      await prisma.customerAddress.updateMany({
        where: { customerId },
        data: { isDefault: false },
      });
    }

    return prisma.customerAddress.create({
      data: {
        customerId,
        label: input.label,
        recipientName: input.recipientName,
        phone: input.phone,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        area: input.area,
        city: input.city,
        postalCode: input.postalCode,
        country: input.country ?? "Bangladesh",
        latitude: input.latitude,
        longitude: input.longitude,
        isDefault: input.isDefault ?? false,
      },
    });
  }

  async updateAddress(
    organizationId: string,
    customerId: string,
    addressId: string,
    input: UpdateAddressInput
  ) {
    const address = await prisma.customerAddress.findFirst({
      where: {
        id: addressId,
        customerId,
        customer: { organizationId },
      },
    });
    if (!address) throw new NotFoundError("Address not found");

    if (input.isDefault) {
      await prisma.customerAddress.updateMany({
        where: { customerId, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    return prisma.customerAddress.update({
      where: { id: addressId },
      data: input,
    });
  }

  async deleteAddress(
    organizationId: string,
    customerId: string,
    addressId: string
  ) {
    const address = await prisma.customerAddress.findFirst({
      where: {
        id: addressId,
        customerId,
        customer: { organizationId },
      },
    });
    if (!address) throw new NotFoundError("Address not found");

    await prisma.customerAddress.delete({ where: { id: addressId } });
    return { id: addressId, deleted: true };
  }
}

export const customerService = new CustomerService();
