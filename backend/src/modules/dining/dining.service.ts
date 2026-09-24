import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../../utils/AppError.js";
import type {
  CreateTableInput,
  UpdateTableInput,
  CreateReservationInput,
  UpdateReservationInput,
  ListTablesQuery,
  ListReservationsQuery,
} from "./dining.validation.js";
import { Prisma } from "@prisma/client";
import crypto from "crypto";

function genNo(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

export class DiningService {
  // ─── Tables ──────────────────────────────────────────────
  async createTable(organizationId: string, input: CreateTableInput) {
    const branch = await prisma.branch.findFirst({
      where: { id: input.branchId, organizationId },
    });
    if (!branch) throw new BadRequestError("Branch not found");

    const existing = await prisma.diningTable.findUnique({
      where: {
        branchId_tableNumber: {
          branchId: input.branchId,
          tableNumber: input.tableNumber,
        },
      },
    });
    if (existing) throw new ConflictError("Table number already exists in this branch");

    const qrToken = crypto.randomBytes(16).toString("hex");

    return prisma.diningTable.create({
      data: {
        organizationId,
        branchId: input.branchId,
        tableNumber: input.tableNumber,
        name: input.name,
        capacity: input.capacity,
        status: input.status ?? "AVAILABLE",
        qrToken,
      },
    });
  }

  async listTables(organizationId: string, query: ListTablesQuery) {
    return prisma.diningTable.findMany({
      where: {
        organizationId,
        ...(query.branchId && { branchId: query.branchId }),
        ...(query.status && { status: query.status }),
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ branchId: "asc" }, { tableNumber: "asc" }],
    });
  }

  async updateTable(
    organizationId: string,
    id: string,
    input: UpdateTableInput
  ) {
    const table = await prisma.diningTable.findFirst({
      where: { id, organizationId },
    });
    if (!table) throw new NotFoundError("Table not found");

    if (input.tableNumber && input.tableNumber !== table.tableNumber) {
      const conflict = await prisma.diningTable.findUnique({
        where: {
          branchId_tableNumber: {
            branchId: table.branchId,
            tableNumber: input.tableNumber,
          },
        },
      });
      if (conflict) throw new ConflictError("Table number already exists");
    }

    return prisma.diningTable.update({
      where: { id },
      data: input,
    });
  }

  async deleteTable(organizationId: string, id: string) {
    const table = await prisma.diningTable.findFirst({
      where: { id, organizationId },
    });
    if (!table) throw new NotFoundError("Table not found");

    await prisma.diningTable.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ─── Reservations ────────────────────────────────────────
  async createReservation(
    organizationId: string,
    input: CreateReservationInput
  ) {
    const branch = await prisma.branch.findFirst({
      where: { id: input.branchId, organizationId },
    });
    if (!branch) throw new BadRequestError("Branch not found");

    if (input.tableId) {
      const table = await prisma.diningTable.findFirst({
        where: { id: input.tableId, organizationId, branchId: input.branchId },
      });
      if (!table) throw new BadRequestError("Table not found");
    }

    if (input.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: input.customerId, organizationId },
      });
      if (!customer) throw new BadRequestError("Customer not found");
    }

    return prisma.reservation.create({
      data: {
        organizationId,
        branchId: input.branchId,
        customerId: input.customerId,
        tableId: input.tableId,
        reservationNo: genNo("RSV"),
        guestName: input.guestName,
        guestPhone: input.guestPhone,
        guestEmail: input.guestEmail,
        guestCount: input.guestCount,
        reservationAt: input.reservationAt,
        notes: input.notes,
        status: "PENDING",
      },
      include: {
        branch: { select: { id: true, name: true } },
        table: { select: { id: true, tableNumber: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });
  }

  async listReservations(organizationId: string, query: ListReservationsQuery) {
    const { page, limit, branchId, status, from, to } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ReservationWhereInput = {
      organizationId,
      ...(branchId && { branchId }),
      ...(status && { status }),
      ...(from || to
        ? {
            reservationAt: {
              ...(from && { gte: from }),
              ...(to && { lte: to }),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { reservationAt: "asc" },
        include: {
          branch: { select: { id: true, name: true } },
          table: { select: { id: true, tableNumber: true, name: true } },
          customer: { select: { id: true, name: true, phone: true } },
        },
      }),
      prisma.reservation.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async updateReservation(
    organizationId: string,
    id: string,
    input: UpdateReservationInput
  ) {
    const reservation = await prisma.reservation.findFirst({
      where: { id, organizationId },
    });
    if (!reservation) throw new NotFoundError("Reservation not found");

    return prisma.reservation.update({
      where: { id },
      data: input,
      include: {
        branch: { select: { id: true, name: true } },
        table: { select: { id: true, tableNumber: true } },
        customer: { select: { id: true, name: true } },
      },
    });
  }

  async deleteReservation(organizationId: string, id: string) {
    const reservation = await prisma.reservation.findFirst({
      where: { id, organizationId },
    });
    if (!reservation) throw new NotFoundError("Reservation not found");

    await prisma.reservation.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    return { id, cancelled: true };
  }
}

export const diningService = new DiningService();
