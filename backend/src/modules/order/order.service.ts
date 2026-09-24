import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../../utils/AppError.js";
import type {
  CreateOrderInput,
  UpdateOrderStatusInput,
  AddPaymentInput,
  CreateRefundInput,
  ListOrdersQuery,
} from "./order.validation.js";
import { Prisma } from "@prisma/client";
import { socketEmit } from "../../socket/index.js";

function genOrderNo() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${date}-${rand}`;
}

function genRefundNo() {
  return `REF-${Date.now().toString(36).toUpperCase()}`;
}

const STATUS_TIMESTAMPS: Record<string, string> = {
  CONFIRMED: "confirmedAt",
  PREPARING: "preparingAt",
  READY: "readyAt",
  DELIVERED: "deliveredAt",
  COMPLETED: "completedAt",
  CANCELLED: "cancelledAt",
};

export class OrderService {
  async create(
    organizationId: string,
    userId: string | undefined,
    input: CreateOrderInput
  ) {
    const branch = await prisma.branch.findFirst({
      where: { id: input.branchId, organizationId },
    });
    if (!branch) throw new BadRequestError("Branch not found");

    // Resolve items from cart or body
    let lineItems: Array<{
      productId: string;
      variantId?: string | null;
      productName: string;
      variantName?: string | null;
      sku?: string | null;
      quantity: number;
      unitPrice: number;
      discount: number;
      tax: number;
      total: number;
      note?: string | null;
      modifiers?: Array<{
        modifierId: string;
        modifierName: string;
        quantity: number;
        unitPrice: number;
        total: number;
      }>;
    }> = [];

    if (input.cartToken) {
      const cart = await prisma.cart.findFirst({
        where: { sessionToken: input.cartToken, organizationId },
        include: {
          items: {
            include: {
              product: true,
              variant: true,
            },
          },
        },
      });
      if (!cart || cart.items.length === 0) {
        throw new BadRequestError("Cart is empty or not found");
      }

      for (const ci of cart.items) {
        const qty = Number(ci.quantity);
        const price = Number(ci.unitPrice);
        lineItems.push({
          productId: ci.productId,
          variantId: ci.variantId,
          productName: ci.product.name,
          variantName: ci.variant?.name,
          sku: ci.variant?.sku ?? ci.product.sku,
          quantity: qty,
          unitPrice: price,
          discount: 0,
          tax: 0,
          total: qty * price,
          note: null,
        });
      }
    } else if (input.items?.length) {
      for (const item of input.items) {
        const product = await prisma.product.findFirst({
          where: { id: item.productId, organizationId },
        });
        if (!product) throw new BadRequestError(`Product ${item.productId} not found`);

        let variantName: string | null = null;
        let sku = product.sku;
        let unitPrice = Number(item.unitPrice ?? product.basePrice);

        if (item.variantId) {
          const variant = await prisma.productVariant.findFirst({
            where: { id: item.variantId, productId: product.id },
          });
          if (!variant) throw new BadRequestError("Variant not found");
          variantName = variant.name;
          sku = variant.sku;
          unitPrice = Number(item.unitPrice ?? variant.price);
        }

        const qty = Number(item.quantity);
        const discount = Number(item.discount ?? 0);
        const tax = Number(item.tax ?? 0);
        let modifiersTotal = 0;
        const mods: typeof lineItems[0]["modifiers"] = [];

        if (item.modifiers?.length) {
          for (const m of item.modifiers) {
            const modifier = await prisma.modifier.findUnique({
              where: { id: m.modifierId },
            });
            if (!modifier) throw new BadRequestError(`Modifier ${m.modifierId} not found`);
            const mQty = Number(m.quantity ?? 1);
            const mPrice = Number(m.unitPrice ?? modifier.price);
            const mTotal = mQty * mPrice;
            modifiersTotal += mTotal;
            mods.push({
              modifierId: m.modifierId,
              modifierName: modifier.name,
              quantity: mQty,
              unitPrice: mPrice,
              total: mTotal,
            });
          }
        }

        const lineTotal = qty * unitPrice - discount + tax + modifiersTotal;
        lineItems.push({
          productId: item.productId,
          variantId: item.variantId,
          productName: product.name,
          variantName,
          sku,
          quantity: qty,
          unitPrice,
          discount,
          tax,
          total: lineTotal,
          note: item.note,
          modifiers: mods,
        });
      }
    } else {
      throw new BadRequestError("Provide items or cartToken");
    }

    const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const discount = Number(input.discount ?? 0);
    const tax = Number(input.tax ?? lineItems.reduce((s, i) => s + i.tax, 0));
    const serviceCharge = Number(input.serviceCharge ?? 0);
    const deliveryFee = Number(input.deliveryFee ?? 0);
    const total = subtotal - discount + tax + serviceCharge + deliveryFee;

    const orderNo = genOrderNo();

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          organizationId,
          branchId: input.branchId,
          customerId: input.customerId,
          customerAddressId: input.customerAddressId,
          tableId: input.tableId,
          orderNo,
          orderType: input.orderType,
          channel: input.channel ?? "POS",
          status: "PENDING",
          fulfillmentStatus: "UNFULFILLED",
          paymentStatus: "UNPAID",
          subtotal,
          discount,
          tax,
          serviceCharge,
          deliveryFee,
          total,
          paidAmount: 0,
          dueAmount: total,
          notes: input.notes,
          createdById: userId,
        },
      });

      for (const li of lineItems) {
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: created.id,
            productId: li.productId,
            variantId: li.variantId,
            productName: li.productName,
            variantName: li.variantName,
            sku: li.sku,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            discount: li.discount,
            tax: li.tax,
            total: li.total,
            note: li.note,
          },
        });

        if (li.modifiers?.length) {
          await tx.orderItemModifier.createMany({
            data: li.modifiers.map((m) => ({
              orderItemId: orderItem.id,
              modifierId: m.modifierId,
              modifierName: m.modifierName,
              quantity: m.quantity,
              unitPrice: m.unitPrice,
              total: m.total,
            })),
          });
        }
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: created.id,
          fromStatus: null,
          toStatus: "PENDING",
          changedById: userId,
          note: "Order created",
        },
      });

      // Create delivery record for delivery orders
      if (input.orderType === "DELIVERY") {
        let addressSnapshot = "";
        if (input.customerAddressId) {
          const addr = await tx.customerAddress.findUnique({
            where: { id: input.customerAddressId },
          });
          if (addr) {
            addressSnapshot = [
              addr.recipientName,
              addr.phone,
              addr.addressLine1,
              addr.addressLine2,
              addr.area,
              addr.city,
            ]
              .filter(Boolean)
              .join(", ");
          }
        }

        await tx.delivery.create({
          data: {
            orderId: created.id,
            status: "PENDING",
            addressSnapshot: addressSnapshot || "N/A",
            deliveryFee,
          },
        });
      }

      // Clear cart if used
      if (input.cartToken) {
        const cart = await tx.cart.findUnique({
          where: { sessionToken: input.cartToken },
        });
        if (cart) {
          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        }
      }

      return created;
    });

    const full = await this.getById(organizationId, order.id);
    try {
      socketEmit.orderCreated(organizationId, input.branchId, full);
    } catch {
      /* socket optional at boot */
    }
    return full;
  }

  async list(organizationId: string, query: ListOrdersQuery) {
    const {
      page,
      limit,
      status,
      paymentStatus,
      orderType,
      branchId,
      customerId,
      search,
      from,
      to,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      organizationId,
      ...(status && { status: status as any }),
      ...(paymentStatus && { paymentStatus: paymentStatus as any }),
      ...(orderType && { orderType: orderType as any }),
      ...(branchId && { branchId }),
      ...(customerId && { customerId }),
      ...(search && {
        OR: [
          { orderNo: { contains: search } },
          { notes: { contains: search } },
        ],
      }),
      ...(from || to
        ? {
            createdAt: {
              ...(from && { gte: from }),
              ...(to && { lte: to }),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          branch: { select: { id: true, name: true, code: true } },
          customer: { select: { id: true, name: true, phone: true } },
          table: { select: { id: true, tableNumber: true } },
          _count: { select: { items: true, payments: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getById(organizationId: string, id: string) {
    const order = await prisma.order.findFirst({
      where: { id, organizationId },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
        customerAddress: true,
        table: { select: { id: true, tableNumber: true, name: true } },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            modifiers: true,
            product: {
              select: { id: true, name: true, sku: true },
            },
            variant: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
        payments: { orderBy: { createdAt: "desc" } },
        refunds: {
          include: { items: true },
          orderBy: { createdAt: "desc" },
        },
        statusHistory: {
          orderBy: { createdAt: "asc" },
          include: {
            changedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        delivery: {
          include: {
            rider: {
              include: {
                user: {
                  select: { firstName: true, lastName: true, phone: true },
                },
              },
            },
            zone: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundError("Order not found");
    return order;
  }

  async updateStatus(
    organizationId: string,
    id: string,
    userId: string,
    input: UpdateOrderStatusInput
  ) {
    const order = await prisma.order.findFirst({
      where: { id, organizationId },
    });
    if (!order) throw new NotFoundError("Order not found");

    if (order.status === "COMPLETED" || order.status === "CANCELLED") {
      throw new BadRequestError(`Cannot change status of ${order.status} order`);
    }

    const timestampField = STATUS_TIMESTAMPS[input.status];
    const data: any = { status: input.status };
    if (timestampField) data[timestampField] = new Date();

    // Auto fulfillment status
    if (["PREPARING"].includes(input.status)) data.fulfillmentStatus = "PREPARING";
    if (["READY"].includes(input.status)) data.fulfillmentStatus = "READY";
    if (["DELIVERED", "COMPLETED"].includes(input.status))
      data.fulfillmentStatus = "COMPLETED";
    if (["CANCELLED", "REJECTED"].includes(input.status))
      data.fulfillmentStatus = "CANCELLED";

    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id }, data });
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: order.status,
          toStatus: input.status,
          note: input.note,
          changedById: userId,
        },
      });
    });

    const full = await this.getById(organizationId, id);
    try {
      socketEmit.orderStatus(organizationId, order.branchId, id, {
        orderId: id,
        orderNo: order.orderNo,
        fromStatus: order.status,
        toStatus: input.status,
        order: full,
      });
    } catch {
      /* ignore */
    }
    return full;
  }

  async addPayment(
    organizationId: string,
    id: string,
    input: AddPaymentInput
  ) {
    const order = await prisma.order.findFirst({
      where: { id, organizationId },
    });
    if (!order) throw new NotFoundError("Order not found");
    if (order.status === "CANCELLED") {
      throw new BadRequestError("Cannot pay cancelled order");
    }

    const amount = Number(input.amount);
    const newPaid = Number(order.paidAmount) + amount;
    const due = Math.max(0, Number(order.total) - newPaid);

    let paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID" = "PARTIALLY_PAID";
    if (due <= 0) paymentStatus = "PAID";
    else if (newPaid <= 0) paymentStatus = "UNPAID";

    await prisma.$transaction(async (tx) => {
      await tx.orderPayment.create({
        data: {
          orderId: id,
          paymentMethod: input.paymentMethod,
          amount,
          transactionId: input.transactionId,
          provider: input.provider,
          status: "SUCCESS",
          paidAt: new Date(),
          metadata: input.metadata ?? undefined,
        },
      });

      await tx.order.update({
        where: { id },
        data: {
          paidAmount: newPaid,
          dueAmount: due,
          paymentStatus,
        },
      });
    });

    return this.getById(organizationId, id);
  }

  async createRefund(
    organizationId: string,
    id: string,
    input: CreateRefundInput
  ) {
    const order = await prisma.order.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });
    if (!order) throw new NotFoundError("Order not found");

    const amount = Number(input.amount);
    if (amount > Number(order.paidAmount)) {
      throw new BadRequestError("Refund amount exceeds paid amount");
    }

    const refund = await prisma.$transaction(async (tx) => {
      const created = await tx.refund.create({
        data: {
          orderId: id,
          refundNo: genRefundNo(),
          amount,
          reason: input.reason,
          status: "SUCCESS",
          processedAt: new Date(),
        },
      });

      if (input.items?.length) {
        await tx.refundItem.createMany({
          data: input.items.map((i) => ({
            refundId: created.id,
            orderItemId: i.orderItemId,
            quantity: i.quantity,
            amount: i.amount,
          })),
        });
      }

      const newPaid = Number(order.paidAmount) - amount;
      const due = Number(order.total) - newPaid;

      let paymentStatus: "PAID" | "PARTIALLY_PAID" | "PARTIALLY_REFUNDED" | "REFUNDED" =
        "PARTIALLY_REFUNDED";
      if (newPaid <= 0) paymentStatus = "REFUNDED";
      else if (newPaid >= Number(order.total)) paymentStatus = "PAID";

      await tx.order.update({
        where: { id },
        data: {
          paidAmount: Math.max(0, newPaid),
          dueAmount: Math.max(0, due),
          paymentStatus,
        },
      });

      return created;
    });

    return this.getById(organizationId, id);
  }
}

export const orderService = new OrderService();
