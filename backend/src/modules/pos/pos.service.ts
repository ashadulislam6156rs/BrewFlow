import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../../utils/AppError.js";
import type {
  CreateDeviceInput,
  UpdateDeviceInput,
  ListDevicesQuery,
  OpenShiftInput,
  CloseShiftInput,
  CreateCashTransactionInput,
  ListShiftsQuery,
} from "./pos.validation.js";
import { Prisma } from "@prisma/client";

export class POSService {
  // ─── Devices ─────────────────────────────────────────────
  async createDevice(organizationId: string, input: CreateDeviceInput) {
    const branch = await prisma.branch.findFirst({
      where: { id: input.branchId, organizationId },
    });
    if (!branch) throw new BadRequestError("Branch not found");

    const existing = await prisma.pOSDevice.findUnique({
      where: {
        organizationId_deviceCode: {
          organizationId,
          deviceCode: input.deviceCode,
        },
      },
    });
    if (existing) throw new ConflictError("Device code already exists");

    return prisma.pOSDevice.create({
      data: {
        organizationId,
        branchId: input.branchId,
        name: input.name,
        deviceCode: input.deviceCode,
        status: input.status ?? "ACTIVE",
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async listDevices(organizationId: string, query: ListDevicesQuery) {
    return prisma.pOSDevice.findMany({
      where: {
        organizationId,
        ...(query.branchId && { branchId: query.branchId }),
        ...(query.status && { status: query.status }),
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        _count: {
          select: {
            shifts: { where: { status: "OPEN" } },
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async updateDevice(
    organizationId: string,
    id: string,
    input: UpdateDeviceInput
  ) {
    const device = await prisma.pOSDevice.findFirst({
      where: { id, organizationId },
    });
    if (!device) throw new NotFoundError("POS device not found");

    return prisma.pOSDevice.update({
      where: { id },
      data: {
        ...input,
        lastSeenAt: new Date(),
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async deleteDevice(organizationId: string, id: string) {
    const device = await prisma.pOSDevice.findFirst({
      where: { id, organizationId },
      include: {
        _count: { select: { shifts: { where: { status: "OPEN" } } } },
      },
    });
    if (!device) throw new NotFoundError("POS device not found");

    if (device._count.shifts > 0) {
      throw new BadRequestError("Cannot delete device with an open shift");
    }

    await prisma.pOSDevice.update({
      where: { id },
      data: { status: "INACTIVE" },
    });
    return { id, deactivated: true };
  }

  async heartbeat(organizationId: string, id: string) {
    const device = await prisma.pOSDevice.findFirst({
      where: { id, organizationId },
    });
    if (!device) throw new NotFoundError("POS device not found");

    return prisma.pOSDevice.update({
      where: { id },
      data: { lastSeenAt: new Date() },
    });
  }

  // ─── Shifts ──────────────────────────────────────────────
  async openShift(
    organizationId: string,
    userId: string,
    input: OpenShiftInput
  ) {
    const branch = await prisma.branch.findFirst({
      where: { id: input.branchId, organizationId },
    });
    if (!branch) throw new BadRequestError("Branch not found");

    // One open shift per user per branch (optional business rule)
    const existingOpen = await prisma.pOSShift.findFirst({
      where: {
        organizationId,
        branchId: input.branchId,
        openedById: userId,
        status: "OPEN",
      },
    });
    if (existingOpen) {
      throw new ConflictError(
        "You already have an open shift on this branch. Close it first."
      );
    }

    if (input.deviceId) {
      const device = await prisma.pOSDevice.findFirst({
        where: {
          id: input.deviceId,
          organizationId,
          status: "ACTIVE",
        },
      });
      if (!device) throw new BadRequestError("POS device not found or inactive");
    }

    const openingCash = Number(input.openingCash ?? 0);

    return prisma.pOSShift.create({
      data: {
        organizationId,
        branchId: input.branchId,
        deviceId: input.deviceId,
        status: "OPEN",
        openedById: userId,
        openingCash,
        expectedCash: openingCash,
        notes: input.notes,
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        device: { select: { id: true, name: true, deviceCode: true } },
        openedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async closeShift(
    organizationId: string,
    shiftId: string,
    userId: string,
    input: CloseShiftInput
  ) {
    const shift = await prisma.pOSShift.findFirst({
      where: { id: shiftId, organizationId },
      include: { cashTransactions: true },
    });
    if (!shift) throw new NotFoundError("Shift not found");
    if (shift.status !== "OPEN") {
      throw new BadRequestError("Shift is already closed");
    }

    // Calculate expected cash from transactions
    let expected = Number(shift.openingCash);
    for (const tx of shift.cashTransactions) {
      const amt = Number(tx.amount);
      if (tx.type === "CASH_IN" || tx.type === "ADJUSTMENT") {
        // ADJUSTMENT can be either; treat positive as in for expected
        expected += amt;
      } else {
        // CASH_OUT, EXPENSE, REFUND
        expected -= amt;
      }
    }

    // Also include successful cash payments on orders during this shift
    // (simplified: use cash transactions only for now)

    const closingCash = Number(input.closingCash);
    const difference = closingCash - expected;

    return prisma.pOSShift.update({
      where: { id: shiftId },
      data: {
        status: input.force ? "FORCE_CLOSED" : "CLOSED",
        closedById: userId,
        closingCash,
        expectedCash: expected,
        cashDifference: difference,
        closedAt: new Date(),
        notes: input.notes ?? shift.notes,
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        device: { select: { id: true, name: true, deviceCode: true } },
        openedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        closedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        cashTransactions: { orderBy: { createdAt: "asc" } },
      },
    });
  }

  async listShifts(organizationId: string, query: ListShiftsQuery) {
    const { page, limit, branchId, status, deviceId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.POSShiftWhereInput = {
      organizationId,
      ...(branchId && { branchId }),
      ...(status && { status }),
      ...(deviceId && { deviceId }),
    };

    const [items, total] = await Promise.all([
      prisma.pOSShift.findMany({
        where,
        skip,
        take: limit,
        orderBy: { openedAt: "desc" },
        include: {
          branch: { select: { id: true, name: true, code: true } },
          device: { select: { id: true, name: true, deviceCode: true } },
          openedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          closedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: { select: { cashTransactions: true } },
        },
      }),
      prisma.pOSShift.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getShiftById(organizationId: string, id: string) {
    const shift = await prisma.pOSShift.findFirst({
      where: { id, organizationId },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        device: { select: { id: true, name: true, deviceCode: true } },
        openedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        closedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        cashTransactions: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!shift) throw new NotFoundError("Shift not found");
    return shift;
  }

  async getCurrentShift(
    organizationId: string,
    userId: string,
    branchId?: string
  ) {
    const shift = await prisma.pOSShift.findFirst({
      where: {
        organizationId,
        openedById: userId,
        status: "OPEN",
        ...(branchId && { branchId }),
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        device: { select: { id: true, name: true, deviceCode: true } },
        cashTransactions: { orderBy: { createdAt: "desc" }, take: 20 },
      },
      orderBy: { openedAt: "desc" },
    });
    return shift; // null if none
  }

  // ─── Cash Transactions ───────────────────────────────────
  async addCashTransaction(
    organizationId: string,
    shiftId: string,
    input: CreateCashTransactionInput
  ) {
    const shift = await prisma.pOSShift.findFirst({
      where: { id: shiftId, organizationId, status: "OPEN" },
    });
    if (!shift) {
      throw new NotFoundError("Open shift not found");
    }

    const amount = Number(input.amount);

    const tx = await prisma.$transaction(async (prismaTx) => {
      const created = await prismaTx.cashTransaction.create({
        data: {
          shiftId,
          type: input.type,
          amount,
          reason: input.reason,
          referenceType: input.referenceType,
          referenceId: input.referenceId,
        },
      });

      // Update expected cash on shift
      let expected = Number(shift.expectedCash);
      if (input.type === "CASH_IN") {
        expected += amount;
      } else {
        expected -= amount;
      }

      await prismaTx.pOSShift.update({
        where: { id: shiftId },
        data: { expectedCash: expected },
      });

      return created;
    });

    return tx;
  }

  async listCashTransactions(organizationId: string, shiftId: string) {
    const shift = await prisma.pOSShift.findFirst({
      where: { id: shiftId, organizationId },
    });
    if (!shift) throw new NotFoundError("Shift not found");

    return prisma.cashTransaction.findMany({
      where: { shiftId },
      orderBy: { createdAt: "asc" },
    });
  }
}

export const posService = new POSService();
