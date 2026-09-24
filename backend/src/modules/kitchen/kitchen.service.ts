import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../../utils/AppError.js";
import type {
  CreateStationInput,
  UpdateStationInput,
  ListStationsQuery,
  CreateTicketInput,
  UpdateTicketStatusInput,
  UpdateTicketItemStatusInput,
  ListTicketsQuery,
} from "./kitchen.validation.js";
import { Prisma } from "@prisma/client";
import { socketEmit } from "../../socket/index.js";

function genTicketNo() {
  return `KT-${Date.now().toString(36).toUpperCase()}`;
}

const TICKET_TIMESTAMPS: Record<string, string> = {
  PREPARING: "startedAt",
  READY: "readyAt",
  COMPLETED: "completedAt",
};

export class KitchenService {
  // ─── Stations ────────────────────────────────────────────
  async createStation(organizationId: string, input: CreateStationInput) {
    const branch = await prisma.branch.findFirst({
      where: { id: input.branchId, organizationId },
    });
    if (!branch) throw new BadRequestError("Branch not found");

    const existing = await prisma.kitchenStation.findUnique({
      where: {
        branchId_code: { branchId: input.branchId, code: input.code },
      },
    });
    if (existing) throw new ConflictError("Station code already exists in this branch");

    return prisma.kitchenStation.create({
      data: {
        organizationId,
        branchId: input.branchId,
        name: input.name,
        code: input.code,
        isActive: input.isActive ?? true,
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async listStations(organizationId: string, query: ListStationsQuery) {
    return prisma.kitchenStation.findMany({
      where: {
        organizationId,
        ...(query.branchId && { branchId: query.branchId }),
        ...(query.isActive !== undefined && { isActive: query.isActive }),
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        _count: {
          select: {
            tickets: {
              where: {
                status: { in: ["QUEUED", "ACCEPTED", "PREPARING"] },
              },
            },
          },
        },
      },
      orderBy: [{ branchId: "asc" }, { name: "asc" }],
    });
  }

  async updateStation(
    organizationId: string,
    id: string,
    input: UpdateStationInput
  ) {
    const station = await prisma.kitchenStation.findFirst({
      where: { id, organizationId },
    });
    if (!station) throw new NotFoundError("Kitchen station not found");

    if (input.code && input.code !== station.code) {
      const conflict = await prisma.kitchenStation.findUnique({
        where: {
          branchId_code: { branchId: station.branchId, code: input.code },
        },
      });
      if (conflict) throw new ConflictError("Station code already exists");
    }

    return prisma.kitchenStation.update({
      where: { id },
      data: input,
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
    });
  }

  async deleteStation(organizationId: string, id: string) {
    const station = await prisma.kitchenStation.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: {
            tickets: {
              where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
            },
          },
        },
      },
    });
    if (!station) throw new NotFoundError("Kitchen station not found");

    if (station._count.tickets > 0) {
      return prisma.kitchenStation.update({
        where: { id },
        data: { isActive: false },
      });
    }

    await prisma.kitchenStation.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ─── Tickets ─────────────────────────────────────────────
  async createTicket(organizationId: string, input: CreateTicketInput) {
    const order = await prisma.order.findFirst({
      where: { id: input.orderId, organizationId },
      include: { items: true },
    });
    if (!order) throw new BadRequestError("Order not found");

    const station = await prisma.kitchenStation.findFirst({
      where: { id: input.stationId, organizationId, isActive: true },
    });
    if (!station) throw new BadRequestError("Kitchen station not found or inactive");

    // Validate order items belong to order
    const orderItemIds = order.items.map((i) => i.id);
    for (const oid of input.orderItemIds) {
      if (!orderItemIds.includes(oid)) {
        throw new BadRequestError(`Order item ${oid} does not belong to this order`);
      }
    }

    const existing = await prisma.kitchenTicket.findUnique({
      where: {
        orderId_stationId: {
          orderId: input.orderId,
          stationId: input.stationId,
        },
      },
    });
    if (existing) {
      throw new ConflictError("Ticket already exists for this order and station");
    }

    const ticket = await prisma.$transaction(async (tx) => {
      const created = await tx.kitchenTicket.create({
        data: {
          orderId: input.orderId,
          stationId: input.stationId,
          ticketNo: genTicketNo(),
          status: "QUEUED",
        },
      });

      await tx.kitchenTicketItem.createMany({
        data: input.orderItemIds.map((orderItemId) => {
          const oi = order.items.find((i) => i.id === orderItemId)!;
          return {
            kitchenTicketId: created.id,
            orderItemId,
            quantity: oi.quantity,
            status: "PENDING",
          };
        }),
      });

      return created;
    });

    const full = await this.getTicketById(organizationId, ticket.id);
    try {
      socketEmit.kitchenTicket(input.stationId, full);
    } catch {
      /* ignore */
    }
    return full;
  }

  /**
   * Auto-create kitchen tickets for an order (all items → default station or first active)
   */
  async createTicketsForOrder(
    organizationId: string,
    orderId: string,
    stationId?: string
  ) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, organizationId },
      include: { items: true, branch: true },
    });
    if (!order) throw new NotFoundError("Order not found");
    if (order.items.length === 0) throw new BadRequestError("Order has no items");

    let station;
    if (stationId) {
      station = await prisma.kitchenStation.findFirst({
        where: { id: stationId, organizationId, isActive: true },
      });
    } else {
      station = await prisma.kitchenStation.findFirst({
        where: {
          organizationId,
          branchId: order.branchId,
          isActive: true,
        },
        orderBy: { createdAt: "asc" },
      });
    }

    if (!station) {
      throw new BadRequestError(
        "No active kitchen station found for this branch. Create a station first."
      );
    }

    return this.createTicket(organizationId, {
      orderId,
      stationId: station.id,
      orderItemIds: order.items.map((i) => i.id),
    });
  }

  async listTickets(organizationId: string, query: ListTicketsQuery) {
    const { page, limit, stationId, branchId, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.KitchenTicketWhereInput = {
      station: { organizationId },
      ...(stationId && { stationId }),
      ...(branchId && { station: { branchId, organizationId } }),
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      prisma.kitchenTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
        include: {
          station: {
            select: { id: true, name: true, code: true, branchId: true },
          },
          order: {
            select: {
              id: true,
              orderNo: true,
              orderType: true,
              status: true,
              table: { select: { tableNumber: true } },
            },
          },
          items: {
            include: {
              orderItem: {
                select: {
                  id: true,
                  productName: true,
                  variantName: true,
                  quantity: true,
                  note: true,
                  modifiers: {
                    select: { modifierName: true, quantity: true },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.kitchenTicket.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getTicketById(organizationId: string, id: string) {
    const ticket = await prisma.kitchenTicket.findFirst({
      where: { id, station: { organizationId } },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            code: true,
            branch: { select: { id: true, name: true } },
          },
        },
        order: {
          select: {
            id: true,
            orderNo: true,
            orderType: true,
            status: true,
            notes: true,
            table: { select: { id: true, tableNumber: true, name: true } },
            customer: { select: { id: true, name: true } },
          },
        },
        items: {
          include: {
            orderItem: {
              select: {
                id: true,
                productName: true,
                variantName: true,
                quantity: true,
                note: true,
                modifiers: true,
              },
            },
          },
        },
      },
    });
    if (!ticket) throw new NotFoundError("Kitchen ticket not found");
    return ticket;
  }

  async updateTicketStatus(
    organizationId: string,
    id: string,
    input: UpdateTicketStatusInput
  ) {
    const ticket = await prisma.kitchenTicket.findFirst({
      where: { id, station: { organizationId } },
      include: { items: true },
    });
    if (!ticket) throw new NotFoundError("Kitchen ticket not found");

    if (["COMPLETED", "CANCELLED"].includes(ticket.status)) {
      throw new BadRequestError(`Cannot change status of ${ticket.status} ticket`);
    }

    const data: any = { status: input.status };
    const tsField = TICKET_TIMESTAMPS[input.status];
    if (tsField) data[tsField] = new Date();

    // When ticket goes PREPARING, mark all pending items as PREPARING
    await prisma.$transaction(async (tx) => {
      await tx.kitchenTicket.update({ where: { id }, data });

      if (input.status === "PREPARING") {
        await tx.kitchenTicketItem.updateMany({
          where: { kitchenTicketId: id, status: "PENDING" },
          data: { status: "PREPARING", startedAt: new Date() },
        });
      }

      if (input.status === "READY") {
        await tx.kitchenTicketItem.updateMany({
          where: {
            kitchenTicketId: id,
            status: { in: ["PENDING", "PREPARING"] },
          },
          data: { status: "READY", readyAt: new Date() },
        });
      }

      if (input.status === "COMPLETED") {
        await tx.kitchenTicketItem.updateMany({
          where: {
            kitchenTicketId: id,
            status: { not: "CANCELLED" },
          },
          data: { status: "SERVED" },
        });
      }

      if (input.status === "CANCELLED") {
        await tx.kitchenTicketItem.updateMany({
          where: { kitchenTicketId: id },
          data: { status: "CANCELLED" },
        });
      }
    });

    const full = await this.getTicketById(organizationId, id);
    try {
      socketEmit.kitchenTicketStatus(ticket.stationId, {
        ticketId: id,
        status: input.status,
        ticket: full,
      });
    } catch {
      /* ignore */
    }
    return full;
  }

  async updateTicketItemStatus(
    organizationId: string,
    ticketId: string,
    itemId: string,
    input: UpdateTicketItemStatusInput
  ) {
    const item = await prisma.kitchenTicketItem.findFirst({
      where: {
        id: itemId,
        kitchenTicketId: ticketId,
        kitchenTicket: { station: { organizationId } },
      },
    });
    if (!item) throw new NotFoundError("Kitchen ticket item not found");

    const data: any = { status: input.status };
    if (input.status === "PREPARING") data.startedAt = new Date();
    if (input.status === "READY") data.readyAt = new Date();

    await prisma.kitchenTicketItem.update({
      where: { id: itemId },
      data,
    });

    // Auto-update ticket status based on items
    const allItems = await prisma.kitchenTicketItem.findMany({
      where: { kitchenTicketId: ticketId },
    });

    const activeItems = allItems.filter((i) => i.status !== "CANCELLED");
    const allReady =
      activeItems.length > 0 &&
      activeItems.every((i) => ["READY", "SERVED"].includes(i.status));
    const allServed =
      activeItems.length > 0 &&
      activeItems.every((i) => i.status === "SERVED");
    const anyPreparing = activeItems.some((i) =>
      ["PREPARING", "READY", "SERVED"].includes(i.status)
    );

    if (allServed) {
      await prisma.kitchenTicket.update({
        where: { id: ticketId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    } else if (allReady) {
      await prisma.kitchenTicket.update({
        where: { id: ticketId },
        data: { status: "READY", readyAt: new Date() },
      });
    } else if (anyPreparing) {
      const ticket = await prisma.kitchenTicket.findUnique({
        where: { id: ticketId },
      });
      if (ticket && ticket.status === "QUEUED") {
        await prisma.kitchenTicket.update({
          where: { id: ticketId },
          data: { status: "PREPARING", startedAt: new Date() },
        });
      }
    }

    return this.getTicketById(organizationId, ticketId);
  }
}

export const kitchenService = new KitchenService();
