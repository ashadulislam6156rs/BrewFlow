import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../../utils/AppError.js";
import type {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  ListInventoryItemsQuery,
  AdjustStockInput,
  ListBalancesQuery,
  ListMovementsQuery,
} from "./inventory.validation.js";
import { Prisma } from "@prisma/client";

export class InventoryService {
  async createItem(organizationId: string, input: CreateInventoryItemInput) {
    const unit = await prisma.unit.findUnique({ where: { id: input.unitId } });
    if (!unit) throw new BadRequestError("Unit not found");

    const existing = await prisma.inventoryItem.findUnique({
      where: {
        organizationId_sku: { organizationId, sku: input.sku },
      },
    });
    if (existing) throw new ConflictError("SKU already exists");

    return prisma.inventoryItem.create({
      data: {
        organizationId,
        name: input.name,
        sku: input.sku,
        barcode: input.barcode,
        type: input.type,
        trackingMode: input.trackingMode ?? "NONE",
        unitId: input.unitId,
        reorderLevel: input.reorderLevel ?? 0,
        reorderQuantity: input.reorderQuantity ?? 0,
        standardCost: input.standardCost,
        isActive: input.isActive ?? true,
      },
      include: {
        unit: { select: { id: true, code: true, name: true, symbol: true } },
      },
    });
  }

  async listItems(organizationId: string, query: ListInventoryItemsQuery) {
    const { page, limit, type, isActive, search, branchId, lowStock } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryItemWhereInput = {
      organizationId,
      ...(type && { type }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { sku: { contains: search } },
          { barcode: { contains: search } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          unit: { select: { id: true, code: true, name: true, symbol: true } },
          balances: branchId
            ? { where: { branchId } }
            : true,
          _count: { select: { batches: true, stockMovements: true } },
        },
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    let filtered = items;
    if (lowStock) {
      filtered = items.filter((item) => {
        const totalQty = item.balances.reduce(
          (s, b) => s + Number(b.quantity),
          0
        );
        return totalQty <= Number(item.reorderLevel);
      });
    }

    return { items: filtered, total: lowStock ? filtered.length : total, page, limit };
  }

  async getItemById(organizationId: string, id: string) {
    const item = await prisma.inventoryItem.findFirst({
      where: { id, organizationId },
      include: {
        unit: { select: { id: true, code: true, name: true, symbol: true } },
        balances: {
          include: {
            branch: { select: { id: true, name: true, code: true } },
          },
        },
        batches: {
          where: { quantity: { gt: 0 } },
          orderBy: { expiryDate: "asc" },
          take: 50,
          include: {
            branch: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });
    if (!item) throw new NotFoundError("Inventory item not found");
    return item;
  }

  async updateItem(
    organizationId: string,
    id: string,
    input: UpdateInventoryItemInput
  ) {
    const item = await prisma.inventoryItem.findFirst({
      where: { id, organizationId },
    });
    if (!item) throw new NotFoundError("Inventory item not found");

    if (input.sku && input.sku !== item.sku) {
      const conflict = await prisma.inventoryItem.findUnique({
        where: {
          organizationId_sku: { organizationId, sku: input.sku },
        },
      });
      if (conflict) throw new ConflictError("SKU already exists");
    }

    if (input.unitId) {
      const unit = await prisma.unit.findUnique({ where: { id: input.unitId } });
      if (!unit) throw new BadRequestError("Unit not found");
    }

    return prisma.inventoryItem.update({
      where: { id },
      data: input,
      include: {
        unit: { select: { id: true, code: true, name: true, symbol: true } },
      },
    });
  }

  async deleteItem(organizationId: string, id: string) {
    const item = await prisma.inventoryItem.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: {
            stockMovements: true,
            purchaseItems: true,
            recipeIngredients: true,
          },
        },
      },
    });
    if (!item) throw new NotFoundError("Inventory item not found");

    if (
      item._count.stockMovements > 0 ||
      item._count.purchaseItems > 0 ||
      item._count.recipeIngredients > 0
    ) {
      return prisma.inventoryItem.update({
        where: { id },
        data: { isActive: false },
      });
    }

    await prisma.inventoryItem.delete({ where: { id } });
    return { id, deleted: true };
  }

  /**
   * Manual stock adjustment (opening, waste, damage, count, etc.)
   */
  async adjustStock(
    organizationId: string,
    itemId: string,
    input: AdjustStockInput
  ) {
    const item = await prisma.inventoryItem.findFirst({
      where: { id: itemId, organizationId },
    });
    if (!item) throw new NotFoundError("Inventory item not found");

    const branch = await prisma.branch.findFirst({
      where: { id: input.branchId, organizationId },
    });
    if (!branch) throw new BadRequestError("Branch not found");

    const qty = Number(input.quantity);
    const isIn = [
      "ADJUSTMENT_IN",
      "OPENING",
      "STOCK_COUNT",
    ].includes(input.type)
      ? qty > 0
      : false;

    // For OUT types, quantity should be positive in input but we store as OUT
    const direction =
      input.type === "ADJUSTMENT_OUT" ||
      input.type === "WASTE" ||
      input.type === "DAMAGE"
        ? "OUT"
        : qty >= 0
          ? "IN"
          : "OUT";

    const absQty = Math.abs(qty);
    const unitCost = input.unitCost != null ? Number(input.unitCost) : Number(item.standardCost ?? 0);

    return prisma.$transaction(async (tx) => {
      // Upsert balance
      let balance = await tx.inventoryBalance.findUnique({
        where: {
          branchId_inventoryItemId: {
            branchId: input.branchId,
            inventoryItemId: itemId,
          },
        },
      });

      if (!balance) {
        balance = await tx.inventoryBalance.create({
          data: {
            branchId: input.branchId,
            inventoryItemId: itemId,
            quantity: 0,
            reservedQuantity: 0,
            averageCost: unitCost,
          },
        });
      }

      const currentQty = Number(balance.quantity);
      const newQty =
        direction === "IN" ? currentQty + absQty : currentQty - absQty;

      if (newQty < 0) {
        throw new BadRequestError(
          `Insufficient stock. Available: ${currentQty}`
        );
      }

      // Weighted average cost on IN
      let newAvgCost = Number(balance.averageCost);
      if (direction === "IN" && absQty > 0) {
        const totalValue =
          currentQty * newAvgCost + absQty * unitCost;
        newAvgCost = newQty > 0 ? totalValue / newQty : unitCost;
      }

      await tx.inventoryBalance.update({
        where: { id: balance.id },
        data: {
          quantity: newQty,
          averageCost: newAvgCost,
        },
      });

      let batchId: string | undefined;
      if (
        direction === "IN" &&
        (item.trackingMode === "BATCH" || item.trackingMode === "EXPIRY")
      ) {
        const batch = await tx.inventoryBatch.create({
          data: {
            branchId: input.branchId,
            inventoryItemId: itemId,
            batchNumber: input.batchNumber,
            quantity: absQty,
            unitCost,
            manufacturingDate: input.manufacturingDate,
            expiryDate: input.expiryDate,
          },
        });
        batchId = batch.id;
      }

      const movement = await tx.stockMovement.create({
        data: {
          branchId: input.branchId,
          inventoryItemId: itemId,
          batchId,
          type: input.type as any,
          direction,
          quantity: absQty,
          unitCost,
          totalCost: absQty * unitCost,
          note: input.note,
          referenceType: "MANUAL_ADJUSTMENT",
        },
      });

      return movement;
    });
  }

  async listBalances(organizationId: string, query: ListBalancesQuery) {
    const { page, limit, branchId, inventoryItemId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryBalanceWhereInput = {
      ...(branchId && { branchId }),
      ...(inventoryItemId && { inventoryItemId }),
      inventoryItem: { organizationId },
    };

    const [items, total] = await Promise.all([
      prisma.inventoryBalance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          branch: { select: { id: true, name: true, code: true } },
          inventoryItem: {
            select: {
              id: true,
              name: true,
              sku: true,
              type: true,
              reorderLevel: true,
              unit: { select: { code: true, symbol: true } },
            },
          },
        },
      }),
      prisma.inventoryBalance.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async listMovements(organizationId: string, query: ListMovementsQuery) {
    const { page, limit, branchId, inventoryItemId, type, from, to } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.StockMovementWhereInput = {
      inventoryItem: { organizationId },
      ...(branchId && { branchId }),
      ...(inventoryItemId && { inventoryItemId }),
      ...(type && { type: type as any }),
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
      prisma.stockMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          branch: { select: { id: true, name: true, code: true } },
          inventoryItem: {
            select: { id: true, name: true, sku: true },
          },
          batch: {
            select: { id: true, batchNumber: true, expiryDate: true },
          },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}

export const inventoryService = new InventoryService();
