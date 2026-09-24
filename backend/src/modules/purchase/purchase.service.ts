import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ForbiddenError,
} from "../../utils/AppError.js";
import type {
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  ListPurchaseOrdersQuery,
  CreateGoodsReceiptInput,
  ListGoodsReceiptsQuery,
} from "./purchase.validation.js";
import { Prisma } from "@prisma/client";

function genDocNo(prefix: string) {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

export class PurchaseService {
  // ─── Purchase Order ──────────────────────────────────────
  async createPO(
    organizationId: string,
    userId: string,
    input: CreatePurchaseOrderInput
  ) {
    const [branch, supplier] = await Promise.all([
      prisma.branch.findFirst({
        where: { id: input.branchId, organizationId },
      }),
      prisma.supplier.findFirst({
        where: { id: input.supplierId, organizationId },
      }),
    ]);
    if (!branch) throw new BadRequestError("Branch not found");
    if (!supplier) throw new BadRequestError("Supplier not found");

    const itemIds = input.items.map((i) => i.inventoryItemId);
    const invItems = await prisma.inventoryItem.findMany({
      where: { id: { in: itemIds }, organizationId },
    });
    if (invItems.length !== itemIds.length) {
      throw new BadRequestError("One or more inventory items are invalid");
    }

    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    const lineItems = input.items.map((item) => {
      const qty = Number(item.quantity);
      const price = Number(item.unitPrice);
      const discount = Number(item.discount ?? 0);
      const tax = Number(item.tax ?? 0);
      const lineTotal = qty * price - discount + tax;
      subtotal += qty * price;
      totalDiscount += discount;
      totalTax += tax;
      return {
        inventoryItemId: item.inventoryItemId,
        unitId: item.unitId,
        quantity: qty,
        unitPrice: price,
        discount,
        tax,
        total: lineTotal,
      };
    });

    const total = subtotal - totalDiscount + totalTax;
    const poNo = input.purchaseOrderNo || genDocNo("PO");

    const existing = await prisma.purchaseOrder.findUnique({
      where: {
        organizationId_purchaseOrderNo: {
          organizationId,
          purchaseOrderNo: poNo,
        },
      },
    });
    if (existing) throw new ConflictError("Purchase order number already exists");

    const po = await prisma.$transaction(async (tx) => {
      const created = await tx.purchaseOrder.create({
        data: {
          organizationId,
          branchId: input.branchId,
          supplierId: input.supplierId,
          purchaseOrderNo: poNo,
          status: "DRAFT",
          orderDate: input.orderDate ?? new Date(),
          expectedDate: input.expectedDate,
          subtotal,
          discount: totalDiscount,
          tax: totalTax,
          total,
          notes: input.notes,
          createdById: userId,
        },
      });

      await tx.purchaseOrderItem.createMany({
        data: lineItems.map((li) => ({
          purchaseOrderId: created.id,
          ...li,
        })),
      });

      return created;
    });

    return this.getPOById(organizationId, po.id);
  }

  async listPOs(organizationId: string, query: ListPurchaseOrdersQuery) {
    const { page, limit, status, branchId, supplierId, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseOrderWhereInput = {
      organizationId,
      ...(status && { status }),
      ...(branchId && { branchId }),
      ...(supplierId && { supplierId }),
      ...(search && {
        OR: [
          { purchaseOrderNo: { contains: search } },
          { notes: { contains: search } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          branch: { select: { id: true, name: true, code: true } },
          supplier: { select: { id: true, name: true, supplierCode: true } },
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: { select: { items: true, goodsReceipts: true } },
        },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getPOById(organizationId: string, id: string) {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, organizationId },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        supplier: {
          select: {
            id: true,
            name: true,
            supplierCode: true,
            phone: true,
            email: true,
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            inventoryItem: {
              select: { id: true, name: true, sku: true },
            },
            unit: { select: { id: true, code: true, symbol: true } },
          },
        },
        goodsReceipts: {
          select: {
            id: true,
            receiptNo: true,
            status: true,
            receivedAt: true,
          },
        },
      },
    });
    if (!po) throw new NotFoundError("Purchase order not found");
    return po;
  }

  async updatePO(
    organizationId: string,
    id: string,
    input: UpdatePurchaseOrderInput
  ) {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, organizationId },
    });
    if (!po) throw new NotFoundError("Purchase order not found");
    if (po.status !== "DRAFT" && po.status !== "REQUESTED") {
      throw new BadRequestError("Only DRAFT or REQUESTED POs can be updated");
    }

    if (input.items) {
      let subtotal = 0;
      let totalDiscount = 0;
      let totalTax = 0;
      const lineItems = input.items.map((item) => {
        const qty = Number(item.quantity);
        const price = Number(item.unitPrice);
        const discount = Number(item.discount ?? 0);
        const tax = Number(item.tax ?? 0);
        const lineTotal = qty * price - discount + tax;
        subtotal += qty * price;
        totalDiscount += discount;
        totalTax += tax;
        return {
          inventoryItemId: item.inventoryItemId,
          unitId: item.unitId,
          quantity: qty,
          unitPrice: price,
          discount,
          tax,
          total: lineTotal,
        };
      });

      await prisma.$transaction(async (tx) => {
        await tx.purchaseOrder.update({
          where: { id },
          data: {
            expectedDate: input.expectedDate,
            notes: input.notes,
            subtotal,
            discount: totalDiscount,
            tax: totalTax,
            total: subtotal - totalDiscount + totalTax,
          },
        });
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
        await tx.purchaseOrderItem.createMany({
          data: lineItems.map((li) => ({ purchaseOrderId: id, ...li })),
        });
      });
    } else {
      await prisma.purchaseOrder.update({
        where: { id },
        data: {
          expectedDate: input.expectedDate,
          notes: input.notes,
        },
      });
    }

    return this.getPOById(organizationId, id);
  }

  async changePOStatus(
    organizationId: string,
    id: string,
    status: "REQUESTED" | "APPROVED" | "REJECTED" | "CANCELLED",
    userId: string
  ) {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, organizationId },
    });
    if (!po) throw new NotFoundError("Purchase order not found");

    const allowed: Record<string, string[]> = {
      DRAFT: ["REQUESTED", "CANCELLED"],
      REQUESTED: ["APPROVED", "REJECTED", "CANCELLED"],
      APPROVED: ["CANCELLED"],
    };

    if (!allowed[po.status]?.includes(status)) {
      throw new BadRequestError(
        `Cannot change status from ${po.status} to ${status}`
      );
    }

    return prisma.purchaseOrder.update({
      where: { id },
      data: {
        status,
        ...(status === "APPROVED" && { approvedById: userId }),
      },
      include: {
        branch: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
      },
    });
  }

  // ─── Goods Receipt ───────────────────────────────────────
  async createGR(
    organizationId: string,
    userId: string,
    input: CreateGoodsReceiptInput
  ) {
    const [branch, supplier] = await Promise.all([
      prisma.branch.findFirst({
        where: { id: input.branchId, organizationId },
      }),
      prisma.supplier.findFirst({
        where: { id: input.supplierId, organizationId },
      }),
    ]);
    if (!branch) throw new BadRequestError("Branch not found");
    if (!supplier) throw new BadRequestError("Supplier not found");

    if (input.purchaseOrderId) {
      const po = await prisma.purchaseOrder.findFirst({
        where: {
          id: input.purchaseOrderId,
          organizationId,
          status: { in: ["APPROVED", "PARTIALLY_RECEIVED"] },
        },
      });
      if (!po) {
        throw new BadRequestError(
          "Purchase order not found or not in receivable status"
        );
      }
    }

    const receiptNo = input.receiptNo || genDocNo("GR");
    const existing = await prisma.goodsReceipt.findUnique({
      where: {
        organizationId_receiptNo: { organizationId, receiptNo },
      },
    });
    if (existing) throw new ConflictError("Receipt number already exists");

    const gr = await prisma.$transaction(async (tx) => {
      const created = await tx.goodsReceipt.create({
        data: {
          organizationId,
          branchId: input.branchId,
          supplierId: input.supplierId,
          purchaseOrderId: input.purchaseOrderId,
          receiptNo,
          status: "DRAFT",
          receivedAt: input.receivedAt ?? new Date(),
          notes: input.notes,
          receivedById: userId,
        },
      });

      await tx.goodsReceiptItem.createMany({
        data: input.items.map((item) => ({
          goodsReceiptId: created.id,
          inventoryItemId: item.inventoryItemId,
          unitId: item.unitId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
        })),
      });

      return created;
    });

    return this.getGRById(organizationId, gr.id);
  }

  /**
   * Post goods receipt → update stock balances + movements + PO received qty
   */
  async postGR(organizationId: string, id: string) {
    const gr = await prisma.goodsReceipt.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });
    if (!gr) throw new NotFoundError("Goods receipt not found");
    if (gr.status !== "DRAFT") {
      throw new BadRequestError("Only DRAFT receipts can be posted");
    }

    await prisma.$transaction(async (tx) => {
      for (const item of gr.items) {
        const qty = Number(item.quantity);
        const cost = Number(item.unitCost);

        // Upsert balance
        let balance = await tx.inventoryBalance.findUnique({
          where: {
            branchId_inventoryItemId: {
              branchId: gr.branchId,
              inventoryItemId: item.inventoryItemId,
            },
          },
        });

        if (!balance) {
          balance = await tx.inventoryBalance.create({
            data: {
              branchId: gr.branchId,
              inventoryItemId: item.inventoryItemId,
              quantity: 0,
              reservedQuantity: 0,
              averageCost: cost,
            },
          });
        }

        const currentQty = Number(balance.quantity);
        const currentAvg = Number(balance.averageCost);
        const newQty = currentQty + qty;
        const newAvg =
          newQty > 0
            ? (currentQty * currentAvg + qty * cost) / newQty
            : cost;

        await tx.inventoryBalance.update({
          where: { id: balance.id },
          data: { quantity: newQty, averageCost: newAvg },
        });

        // Batch if needed
        let batchId: string | undefined;
        const invItem = await tx.inventoryItem.findUnique({
          where: { id: item.inventoryItemId },
        });
        if (
          invItem &&
          (invItem.trackingMode === "BATCH" || invItem.trackingMode === "EXPIRY")
        ) {
          const batch = await tx.inventoryBatch.create({
            data: {
              branchId: gr.branchId,
              inventoryItemId: item.inventoryItemId,
              batchNumber: item.batchNumber,
              quantity: qty,
              unitCost: cost,
              expiryDate: item.expiryDate,
            },
          });
          batchId = batch.id;
        }

        await tx.stockMovement.create({
          data: {
            branchId: gr.branchId,
            inventoryItemId: item.inventoryItemId,
            batchId,
            type: "PURCHASE",
            direction: "IN",
            quantity: qty,
            unitCost: cost,
            totalCost: qty * cost,
            referenceType: "GoodsReceipt",
            referenceId: gr.id,
          },
        });

        // Update PO item received qty if linked
        if (gr.purchaseOrderId) {
          const poItem = await tx.purchaseOrderItem.findFirst({
            where: {
              purchaseOrderId: gr.purchaseOrderId,
              inventoryItemId: item.inventoryItemId,
            },
          });
          if (poItem) {
            await tx.purchaseOrderItem.update({
              where: { id: poItem.id },
              data: {
                receivedQuantity: Number(poItem.receivedQuantity) + qty,
              },
            });
          }
        }
      }

      await tx.goodsReceipt.update({
        where: { id },
        data: { status: "POSTED" },
      });

      // Update PO status
      if (gr.purchaseOrderId) {
        const poItems = await tx.purchaseOrderItem.findMany({
          where: { purchaseOrderId: gr.purchaseOrderId },
        });
        const allReceived = poItems.every(
          (i) => Number(i.receivedQuantity) >= Number(i.quantity)
        );
        const anyReceived = poItems.some(
          (i) => Number(i.receivedQuantity) > 0
        );
        await tx.purchaseOrder.update({
          where: { id: gr.purchaseOrderId },
          data: {
            status: allReceived
              ? "RECEIVED"
              : anyReceived
                ? "PARTIALLY_RECEIVED"
                : undefined,
          },
        });
      }
    });

    return this.getGRById(organizationId, id);
  }

  async listGRs(organizationId: string, query: ListGoodsReceiptsQuery) {
    const { page, limit, status, branchId, supplierId, purchaseOrderId } =
      query;
    const skip = (page - 1) * limit;

    const where: Prisma.GoodsReceiptWhereInput = {
      organizationId,
      ...(status && { status }),
      ...(branchId && { branchId }),
      ...(supplierId && { supplierId }),
      ...(purchaseOrderId && { purchaseOrderId }),
    };

    const [items, total] = await Promise.all([
      prisma.goodsReceipt.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          branch: { select: { id: true, name: true, code: true } },
          supplier: { select: { id: true, name: true, supplierCode: true } },
          purchaseOrder: {
            select: { id: true, purchaseOrderNo: true },
          },
          receivedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: { select: { items: true } },
        },
      }),
      prisma.goodsReceipt.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getGRById(organizationId: string, id: string) {
    const gr = await prisma.goodsReceipt.findFirst({
      where: { id, organizationId },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        supplier: {
          select: { id: true, name: true, supplierCode: true },
        },
        purchaseOrder: {
          select: { id: true, purchaseOrderNo: true, status: true },
        },
        receivedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            inventoryItem: {
              select: { id: true, name: true, sku: true },
            },
            unit: { select: { id: true, code: true, symbol: true } },
          },
        },
      },
    });
    if (!gr) throw new NotFoundError("Goods receipt not found");
    return gr;
  }

  async cancelGR(organizationId: string, id: string) {
    const gr = await prisma.goodsReceipt.findFirst({
      where: { id, organizationId },
    });
    if (!gr) throw new NotFoundError("Goods receipt not found");
    if (gr.status !== "DRAFT") {
      throw new BadRequestError("Only DRAFT receipts can be cancelled");
    }

    return prisma.goodsReceipt.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
  }
}

export const purchaseService = new PurchaseService();
