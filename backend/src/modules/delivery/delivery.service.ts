import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../../utils/AppError.js";
import type {
  CreateDeliveryZoneInput,
  UpdateDeliveryZoneInput,
  CreateRiderInput,
  UpdateRiderInput,
  AssignDeliveryInput,
  UpdateDeliveryStatusInput,
} from "./delivery.validation.js";

function genCode(prefix: string) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

export class DeliveryService {
  // ─── Zones ───────────────────────────────────────────────
  async createZone(organizationId: string, input: CreateDeliveryZoneInput) {
    if (input.branchId) {
      const branch = await prisma.branch.findFirst({
        where: { id: input.branchId, organizationId },
      });
      if (!branch) throw new BadRequestError("Branch not found");
    }

    return prisma.deliveryZone.create({
      data: {
        organizationId,
        branchId: input.branchId,
        name: input.name,
        description: input.description,
        deliveryFee: input.deliveryFee ?? 0,
        minimumOrder: input.minimumOrder ?? 0,
        estimatedMin: input.estimatedMin,
        estimatedMax: input.estimatedMax,
        isActive: input.isActive ?? true,
      },
    });
  }

  async listZones(organizationId: string, activeOnly = false) {
    return prisma.deliveryZone.findMany({
      where: {
        organizationId,
        ...(activeOnly && { isActive: true }),
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async updateZone(
    organizationId: string,
    id: string,
    input: UpdateDeliveryZoneInput
  ) {
    const zone = await prisma.deliveryZone.findFirst({
      where: { id, organizationId },
    });
    if (!zone) throw new NotFoundError("Delivery zone not found");

    return prisma.deliveryZone.update({
      where: { id },
      data: input,
    });
  }

  async deleteZone(organizationId: string, id: string) {
    const zone = await prisma.deliveryZone.findFirst({
      where: { id, organizationId },
    });
    if (!zone) throw new NotFoundError("Delivery zone not found");

    await prisma.deliveryZone.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ─── Riders ──────────────────────────────────────────────
  async createRider(organizationId: string, input: CreateRiderInput) {
    const user = await prisma.user.findFirst({
      where: { id: input.userId, organizationId },
    });
    if (!user) throw new BadRequestError("User not found");

    const existing = await prisma.riderProfile.findUnique({
      where: { userId: input.userId },
    });
    if (existing) throw new ConflictError("User already has a rider profile");

    return prisma.riderProfile.create({
      data: {
        userId: input.userId,
        riderCode: input.riderCode || genCode("RDR"),
        vehicleType: input.vehicleType,
        vehicleNo: input.vehicleNo,
        status: input.status ?? "OFFLINE",
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
    });
  }

  async listRiders(organizationId: string) {
    return prisma.riderProfile.findMany({
      where: { user: { organizationId } },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateRider(
    organizationId: string,
    id: string,
    input: UpdateRiderInput
  ) {
    const rider = await prisma.riderProfile.findFirst({
      where: { id, user: { organizationId } },
    });
    if (!rider) throw new NotFoundError("Rider not found");

    return prisma.riderProfile.update({
      where: { id },
      data: input,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
    });
  }

  // ─── Delivery (order-linked) ─────────────────────────────
  async getDelivery(organizationId: string, id: string) {
    const delivery = await prisma.delivery.findFirst({
      where: { id, order: { organizationId } },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            status: true,
            total: true,
          },
        },
        zone: true,
        rider: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, phone: true },
            },
          },
        },
        assignments: {
          include: {
            rider: {
              include: {
                user: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
          orderBy: { assignedAt: "desc" },
        },
      },
    });
    if (!delivery) throw new NotFoundError("Delivery not found");
    return delivery;
  }

  async assignRider(
    organizationId: string,
    deliveryId: string,
    input: AssignDeliveryInput
  ) {
    const delivery = await prisma.delivery.findFirst({
      where: { id: deliveryId, order: { organizationId } },
    });
    if (!delivery) throw new NotFoundError("Delivery not found");

    const rider = await prisma.riderProfile.findFirst({
      where: { id: input.riderId, user: { organizationId } },
    });
    if (!rider) throw new BadRequestError("Rider not found");

    return prisma.$transaction(async (tx) => {
      // Unassign previous if any
      if (delivery.riderId) {
        await tx.deliveryAssignment.updateMany({
          where: {
            deliveryId,
            riderId: delivery.riderId,
            unassignedAt: null,
          },
          data: { unassignedAt: new Date() },
        });
      }

      await tx.deliveryAssignment.create({
        data: {
          deliveryId,
          riderId: input.riderId,
          note: input.note,
        },
      });

      return tx.delivery.update({
        where: { id: deliveryId },
        data: {
          riderId: input.riderId,
          status: "ASSIGNED",
          assignedAt: new Date(),
        },
        include: {
          rider: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  phone: true,
                },
              },
            },
          },
        },
      });
    });
  }

  async updateStatus(
    organizationId: string,
    deliveryId: string,
    input: UpdateDeliveryStatusInput
  ) {
    const delivery = await prisma.delivery.findFirst({
      where: { id: deliveryId, order: { organizationId } },
    });
    if (!delivery) throw new NotFoundError("Delivery not found");

    const statusTimestamps: Record<string, object> = {
      PICKED_UP: { pickedUpAt: new Date() },
      OUT_FOR_DELIVERY: { outForDeliveryAt: new Date() },
      DELIVERED: { deliveredAt: new Date() },
    };

    return prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        status: input.status,
        failureReason: input.failureReason,
        ...(statusTimestamps[input.status] || {}),
      },
    });
  }

  async listDeliveries(
    organizationId: string,
    filters: { status?: string; riderId?: string; page?: number; limit?: number } = {}
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      order: { organizationId },
      ...(filters.status && { status: filters.status as any }),
      ...(filters.riderId && { riderId: filters.riderId }),
    };

    const [items, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          order: {
            select: { id: true, orderNo: true, total: true, status: true },
          },
          rider: {
            include: {
              user: {
                select: { firstName: true, lastName: true, phone: true },
              },
            },
          },
          zone: { select: { id: true, name: true, deliveryFee: true } },
        },
      }),
      prisma.delivery.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}

export const deliveryService = new DeliveryService();
