import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../../utils/AppError.js";
import type {
  CreateUnitInput,
  UpdateUnitInput,
  CreateUnitConversionInput,
  UpdateUnitConversionInput,
} from "./unit.validation.js";

export class UnitService {
  async list() {
    return prisma.unit.findMany({
      orderBy: { code: "asc" },
      include: {
        _count: {
          select: {
            inventoryItems: true,
            fromConversions: true,
            toConversions: true,
          },
        },
      },
    });
  }

  async getById(id: string) {
    const unit = await prisma.unit.findUnique({
      where: { id },
      include: {
        fromConversions: {
          include: { toUnit: { select: { id: true, code: true, name: true } } },
        },
        toConversions: {
          include: {
            fromUnit: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });
    if (!unit) throw new NotFoundError("Unit not found");
    return unit;
  }

  async create(input: CreateUnitInput) {
    const existing = await prisma.unit.findUnique({
      where: { code: input.code },
    });
    if (existing) throw new ConflictError("Unit code already exists");

    return prisma.unit.create({
      data: {
        code: input.code,
        name: input.name,
        symbol: input.symbol,
        decimalPlaces: input.decimalPlaces ?? 2,
      },
    });
  }

  async update(id: string, input: UpdateUnitInput) {
    const unit = await prisma.unit.findUnique({ where: { id } });
    if (!unit) throw new NotFoundError("Unit not found");

    return prisma.unit.update({
      where: { id },
      data: input,
    });
  }

  async delete(id: string) {
    const unit = await prisma.unit.findUnique({
      where: { id },
      include: {
        _count: { select: { inventoryItems: true, recipeItems: true } },
      },
    });
    if (!unit) throw new NotFoundError("Unit not found");

    if (unit._count.inventoryItems > 0 || unit._count.recipeItems > 0) {
      throw new BadRequestError(
        "Cannot delete unit that is in use by inventory or recipes"
      );
    }

    await prisma.unit.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ─── Unit Conversion ─────────────────────────────────────
  async listConversions() {
    return prisma.unitConversion.findMany({
      include: {
        fromUnit: { select: { id: true, code: true, name: true, symbol: true } },
        toUnit: { select: { id: true, code: true, name: true, symbol: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createConversion(input: CreateUnitConversionInput) {
    if (input.fromUnitId === input.toUnitId) {
      throw new BadRequestError("From and To unit cannot be the same");
    }

    const [from, to] = await Promise.all([
      prisma.unit.findUnique({ where: { id: input.fromUnitId } }),
      prisma.unit.findUnique({ where: { id: input.toUnitId } }),
    ]);
    if (!from || !to) throw new BadRequestError("Invalid unit ID(s)");

    const existing = await prisma.unitConversion.findUnique({
      where: {
        fromUnitId_toUnitId: {
          fromUnitId: input.fromUnitId,
          toUnitId: input.toUnitId,
        },
      },
    });
    if (existing) throw new ConflictError("Conversion already exists");

    return prisma.unitConversion.create({
      data: {
        fromUnitId: input.fromUnitId,
        toUnitId: input.toUnitId,
        multiplier: input.multiplier,
      },
      include: {
        fromUnit: { select: { id: true, code: true, name: true } },
        toUnit: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async updateConversion(id: string, input: UpdateUnitConversionInput) {
    const conv = await prisma.unitConversion.findUnique({ where: { id } });
    if (!conv) throw new NotFoundError("Unit conversion not found");

    return prisma.unitConversion.update({
      where: { id },
      data: { multiplier: input.multiplier },
      include: {
        fromUnit: { select: { id: true, code: true, name: true } },
        toUnit: { select: { id: true, code: true, name: true } },
      },
    });
  }

  async deleteConversion(id: string) {
    const conv = await prisma.unitConversion.findUnique({ where: { id } });
    if (!conv) throw new NotFoundError("Unit conversion not found");

    await prisma.unitConversion.delete({ where: { id } });
    return { id, deleted: true };
  }
}

export const unitService = new UnitService();
