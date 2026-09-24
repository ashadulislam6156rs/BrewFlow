import { prisma } from "../../config/database.js";
import { NotFoundError } from "../../utils/AppError.js";
import type {
  CreateNotificationInput,
  ListNotificationsQuery,
} from "./notification.validation.js";
import { Prisma } from "@prisma/client";

export class NotificationService {
  async create(organizationId: string, input: CreateNotificationInput) {
    return prisma.notification.create({
      data: {
        organizationId,
        userId: input.userId,
        type: input.type,
        channel: input.channel ?? "IN_APP",
        title: input.title,
        message: input.message,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        status: "PENDING",
      },
    });
  }

  async listForUser(
    organizationId: string,
    userId: string,
    query: ListNotificationsQuery
  ) {
    const { page, limit, status, type, unreadOnly } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      organizationId,
      OR: [{ userId }, { userId: null }],
      ...(status && { status }),
      ...(type && { type }),
      ...(unreadOnly && { readAt: null }),
    };

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          organizationId,
          OR: [{ userId }, { userId: null }],
          readAt: null,
        },
      }),
    ]);

    return { items, total, page, limit, unreadCount };
  }

  async markRead(organizationId: string, userId: string, id: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        organizationId,
        OR: [{ userId }, { userId: null }],
      },
    });
    if (!notification) throw new NotFoundError("Notification not found");

    return prisma.notification.update({
      where: { id },
      data: {
        status: "READ",
        readAt: new Date(),
      },
    });
  }

  async markAllRead(organizationId: string, userId: string) {
    const result = await prisma.notification.updateMany({
      where: {
        organizationId,
        OR: [{ userId }, { userId: null }],
        readAt: null,
      },
      data: {
        status: "READ",
        readAt: new Date(),
      },
    });
    return { updated: result.count };
  }

  async markSent(organizationId: string, id: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, organizationId },
    });
    if (!notification) throw new NotFoundError("Notification not found");

    return prisma.notification.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    });
  }
}

export const notificationService = new NotificationService();
