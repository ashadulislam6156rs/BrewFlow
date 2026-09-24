import { prisma } from "../../config/database.js";
import type {
  CreateAuditLogInput,
  ListAuditQuery,
} from "./audit.validation.js";
import { Prisma } from "@prisma/client";

export class AuditService {
  async log(
    organizationId: string,
    userId: string | undefined,
    input: CreateAuditLogInput
  ) {
    return prisma.auditLog.create({
      data: {
        organizationId,
        branchId: input.branchId,
        userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        oldData: input.oldData ?? undefined,
        newData: input.newData ?? undefined,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        requestId: input.requestId,
      },
    });
  }

  async list(organizationId: string, query: ListAuditQuery) {
    const { page, limit, entityType, entityId, userId, action, from, to } =
      query;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      organizationId,
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...(userId && { userId }),
      ...(action && { action: { contains: action } }),
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
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          branch: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}

export const auditService = new AuditService();
