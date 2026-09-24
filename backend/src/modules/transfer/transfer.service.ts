import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../../utils/AppError.js";
import type {
  CreateStockTransferInput,
  UpdateStockTransferInput,
  ReceiveTransferInput,
  ListStockTransfersQuery,
} from "./transfer.validation.js";
import { Prisma } from "@prisma/client";

function genDocNo(prefix: string) {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

export class TransferService {
  async create(
    organizationId: string,
    userId: string,
    input: CreateStockTransferInput
  ) {
    if (input.fromBranchId === input.toBranchId) {
      throw new BadRequestError("From and To branch cannot be the same");
    }

    const [fromBranch, toBranch] = await Promise.all([
      prisma.branch.findFirst({
        where: { id: input.fromBranchId, organizationId },
      }),
      prisma.branch.findFirst({
        where: { id: input.toBranchId, organizationId },
      }),
    ]);
    if (!fromBranch || !toBranch) {
      throw new BadRequestError("Invalid branch ID(s)");
    }

    const itemIds = input.items.map((i) => i.inventoryItemId);
    const invItems = await prisma.inventoryItem.findMany({
      where: { id: { in: itemIds }, organizationId },
    });
    if (invItems.length !== itemIds.length) {
      throw new BadRequestError("One or more inventory items are invalid");
    }

    const transferNo = input.transferNo || genDocNo("ST");
    const existing = await prisma.stockTransfer.findUnique({
      where: {
        organizationId_transferNo: { organizationId, transferNo },
      },
    });
    if (existing) throw new ConflictError("Transfer number already exists");

    const transfer = await prisma.$transaction(async (tx) => {
      const created = await tx.stockTransfer.create({
        data: {
          organizationId,
          transferNo,
          fromBranchId: input.fromBranchId,
          toBranchId: input.toBranchId,
          status: "DRAFT",
          requestedById: userId,
          notes: input.notes,
        },
      });

      await tx.stockTransferItem.createMany({
        data: input.items.map((item) => ({
          stockTransferId: created.id,
          inventoryItemId: item.inventoryItemId,
          quantity: item.quantity,
          unitCost: item.unitCost ?? 0,
        })),
      });

      return created;
    });

    return this.getById(organizationId, transfer.id);
  }

  async list(organizationId: string, query: ListStockTransfersQuery) {
    const { page, limit, status, fromBranchId, toBranchId, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.StockTransferWhereInput = {
      organizationId,
      ...(status && { status }),
      ...(fromBranchId && { fromBranchId }),
      ...(toBranchId && { toBranchId }),
      ...(search && {
        transferNo: { contains: search },
      }),
    };

    const [items, total] = await Promise.all([
      prisma.stockTransfer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          fromBranch: { select: { id: true, name: true, code: true } },
          toBranch: { select: { id: true, name: true, code: true } },
          requestedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: { select: { items: true } },
        },
      }),
      prisma.stockTransfer.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getById(organizationId: string, id: string) {
    const transfer = await prisma.stockTransfer.findFirst({
      where: { id, organizationId },
      include: {
        fromBranch: { select: { id: true, name: true, code: true } },
        toBranch: { select: { id: true, name: true, code: true } },
        requestedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        shippedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        receivedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        items: {
          include: {
            inventoryItem: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
    });
    if (!transfer) throw new NotFoundError("Stock transfer not found");
    return transfer;
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateStockTransferInput
  ) {
    const transfer = await prisma.stockTransfer.findFirst({
      where: { id, organizationId },
    });
    if (!transfer) throw new NotFoundError("Stock transfer not found");
    if (transfer.status !== "DRAFT") {
      throw new BadRequestError("Only DRAFT transfers can be updated");
    }

    await prisma.$transaction(async (tx) => {
      await tx.stockTransfer.update({
        where: { id },
        data: { notes: input.notes },
      });

      if (input.items) {
        await tx.stockTransferItem.deleteMany({
          where: { stockTransferId: id },
        });
        await tx.stockTransferItem.createMany({
          data: input.items.map((item) => ({
            stockTransferId: id,
            inventoryItemId: item.inventoryItemId,
            quantity: item.quantity,
            unitCost: item.unitCost ?? 0,
          })),
        });
      }
    });

    return this.getById(organizationId, id);
  }

  async changeStatus(
    organizationId: string,
    id: string,
    action: "request" | "approve" | "reject" | "ship" | "cancel",
    userId: string
  ) {
    const transfer = await prisma.stockTransfer.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });
    if (!transfer) throw new NotFoundError("Stock transfer not found");

    const transitions: Record<string, { from: string[]; to: string; extra?: any }> = {
      request: { from: ["DRAFT"], to: "REQUESTED", extra: { requestedAt: new Date() } },
      approve: {
        from: ["REQUESTED"],
        to: "APPROVED",
        extra: { approvedById: userId, approvedAt: new Date() },
      },
      reject: { from: ["REQUESTED"], to: "REJECTED" },
      ship: {
        from: ["APPROVED", "PACKED"],
        to: "IN_TRANSIT",
        extra: { shippedById: userId, shippedAt: new Date() },
      },
      cancel: {
        from: ["DRAFT", "REQUESTED", "APPROVED"],
        to: "CANCELLED",
      },
    };

    const t = transitions[action];
    if (!t || !t.from.includes(transfer.status)) {
      throw new BadRequestError(
        `Cannot ${action} transfer in status ${transfer.status}`
      );
    }

    // On ship: deduct stock from source branch
    if (action === "ship") {
      await prisma.$transaction(async (tx) => {
        for (const item of transfer.items) {
          const qty = Number(item.quantity);
          const cost = Number(item.unitCost);

          const balance = await tx.inventoryBalance.findUnique({
            where: {
              branchId_inventoryItemId: {
                branchId: transfer.fromBranchId,
                inventoryItemId: item.inventoryItemId,
              },
            },
          });

          if (!balance || Number(balance.quantity) < qty) {
            throw new BadRequestError(
              `Insufficient stock for item ${item.inventoryItemId}. Available: ${balance?.quantity ?? 0}`
            );
          }

          await tx.inventoryBalance.update({
            where: { id: balance.id },
            data: { quantity: Number(balance.quantity) - qty },
          });

          await tx.stockMovement.create({
            data: {
              branchId: transfer.fromBranchId,
              inventoryItemId: item.inventoryItemId,
              type: "TRANSFER_OUT",
              direction: "OUT",
              quantity: qty,
              unitCost: cost,
              totalCost: qty * cost,
              referenceType: "StockTransfer",
              referenceId: transfer.id,
            },
          });
        }

        await tx.stockTransfer.update({
          where: { id },
          data: { status: t.to as any, ...t.extra },
        });
      });
    } else {
      await prisma.stockTransfer.update({
        where: { id },
        data: { status: t.to as any, ...t.extra },
      });
    }

    return this.getById(organizationId, id);
  }

  /**
   * Receive transfer at destination branch
   */
  async receive(
    organizationId: string,
    id: string,
    userId: string,
    input: ReceiveTransferInput
  ) {
    const transfer = await prisma.stockTransfer.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });
    if (!transfer) throw new NotFoundError("Stock transfer not found");
    if (
      transfer.status !== "IN_TRANSIT" &&
      transfer.status !== "PARTIALLY_RECEIVED"
    ) {
      throw new BadRequestError(
        "Transfer must be IN_TRANSIT or PARTIALLY_RECEIVED to receive"
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const recv of input.items) {
        const transferItem = transfer.items.find(
          (i) => i.inventoryItemId === recv.inventoryItemId
        );
        if (!transferItem) {
          throw new BadRequestError(
            `Item ${recv.inventoryItemId} not in this transfer`
          );
        }

        const recvQty = Number(recv.receivedQuantity);
        const alreadyRecv = Number(transferItem.receivedQuantity);
        const maxQty = Number(transferItem.quantity);
        if (alreadyRecv + recvQty > maxQty) {
          throw new BadRequestError(
            `Cannot receive more than ordered. Remaining: ${maxQty - alreadyRecv}`
          );
        }

        const cost = Number(transferItem.unitCost);

        // Update destination balance
        let balance = await tx.inventoryBalance.findUnique({
          where: {
            branchId_inventoryItemId: {
              branchId: transfer.toBranchId,
              inventoryItemId: recv.inventoryItemId,
            },
          },
        });

        if (!balance) {
          balance = await tx.inventoryBalance.create({
            data: {
              branchId: transfer.toBranchId,
              inventoryItemId: recv.inventoryItemId,
              quantity: 0,
              reservedQuantity: 0,
              averageCost: cost,
            },
          });
        }

        const currentQty = Number(balance.quantity);
        const currentAvg = Number(balance.averageCost);
        const newQty = currentQty + recvQty;
        const newAvg =
          newQty > 0
            ? (currentQty * currentAvg + recvQty * cost) / newQty
            : cost;

        await tx.inventoryBalance.update({
          where: { id: balance.id },
          data: { quantity: newQty, averageCost: newAvg },
        });

        await tx.stockMovement.create({
          data: {
            branchId: transfer.toBranchId,
            inventoryItemId: recv.inventoryItemId,
            type: "TRANSFER_IN",
            direction: "IN",
            quantity: recvQty,
            unitCost: cost,
            totalCost: recvQty * cost,
            referenceType: "StockTransfer",
            referenceId: transfer.id,
          },
        });

        await tx.stockTransferItem.update({
          where: { id: transferItem.id },
          data: { receivedQuantity: alreadyRecv + recvQty },
        });
      }

      // Check if fully received
      const updatedItems = await tx.stockTransferItem.findMany({
        where: { stockTransferId: id },
      });
      const fullyReceived = updatedItems.every(
        (i) => Number(i.receivedQuantity) >= Number(i.quantity)
      );

      await tx.stockTransfer.update({
        where: { id },
        data: {
          status: fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED",
          receivedById: userId,
          receivedAt: fullyReceived ? new Date() : transfer.receivedAt,
        },
      });
    });

    return this.getById(organizationId, id);
  }
}

export const transferService = new TransferService();
