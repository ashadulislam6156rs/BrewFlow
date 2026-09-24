import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ForbiddenError,
} from "../../utils/AppError.js";
import type {
  CreateBranchInput,
  UpdateBranchInput,
  ListBranchesQuery,
} from "./branch.validation.js";
import { Prisma } from "@prisma/client";

export class BranchService {
  async create(organizationId: string, input: CreateBranchInput) {
    // Check unique code & slug within org
    const existing = await prisma.branch.findFirst({
      where: {
        organizationId,
        OR: [{ code: input.code }, { slug: input.slug }],
      },
    });

    if (existing) {
      if (existing.code === input.code) {
        throw new ConflictError("Branch code already exists in this organization");
      }
      throw new ConflictError("Branch slug already exists in this organization");
    }

    const branch = await prisma.branch.create({
      data: {
        organizationId,
        code: input.code,
        name: input.name,
        slug: input.slug,
        description: input.description,
        address: input.address,
        area: input.area,
        city: input.city,
        postalCode: input.postalCode,
        country: input.country ?? "Bangladesh",
        latitude: input.latitude,
        longitude: input.longitude,
        phone: input.phone,
        email: input.email,
        openingTime: input.openingTime,
        closingTime: input.closingTime,
        status: input.status ?? "ACTIVE",
      },
      include: {
        imageAsset: {
          select: { id: true, publicId: true, secureUrl: true },
        },
      },
    });

    return branch;
  }

  async list(organizationId: string, query: ListBranchesQuery) {
    const { page, limit, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BranchWhereInput = {
      organizationId,
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { code: { contains: search } },
          { slug: { contains: search } },
          { city: { contains: search } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.branch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          imageAsset: {
            select: { id: true, publicId: true, secureUrl: true },
          },
          _count: {
            select: {
              userBranches: true,
              productBranches: true,
            },
          },
        },
      }),
      prisma.branch.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getById(organizationId: string, branchId: string) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, organizationId },
      include: {
        imageAsset: {
          select: { id: true, publicId: true, secureUrl: true },
        },
        userBranches: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            productBranches: true,
            orders: true,
            tables: true,
          },
        },
      },
    });

    if (!branch) {
      throw new NotFoundError("Branch not found");
    }

    return branch;
  }

  async update(
    organizationId: string,
    branchId: string,
    input: UpdateBranchInput
  ) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, organizationId },
    });

    if (!branch) {
      throw new NotFoundError("Branch not found");
    }

    // Check uniqueness if code or slug is changing
    if (input.code || input.slug) {
      const conflict = await prisma.branch.findFirst({
        where: {
          organizationId,
          id: { not: branchId },
          OR: [
            ...(input.code ? [{ code: input.code }] : []),
            ...(input.slug ? [{ slug: input.slug }] : []),
          ],
        },
      });

      if (conflict) {
        if (input.code && conflict.code === input.code) {
          throw new ConflictError("Branch code already exists");
        }
        throw new ConflictError("Branch slug already exists");
      }
    }

    const updated = await prisma.branch.update({
      where: { id: branchId },
      data: {
        ...input,
        latitude: input.latitude,
        longitude: input.longitude,
      },
      include: {
        imageAsset: {
          select: { id: true, publicId: true, secureUrl: true },
        },
      },
    });

    return updated;
  }

  async delete(organizationId: string, branchId: string) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, organizationId },
      include: {
        _count: {
          select: {
            orders: true,
            productBranches: true,
            inventoryBalances: true,
          },
        },
      },
    });

    if (!branch) {
      throw new NotFoundError("Branch not found");
    }

    if (
      branch._count.orders > 0 ||
      branch._count.productBranches > 0 ||
      branch._count.inventoryBalances > 0
    ) {
      // Soft delete by setting status to CLOSED
      const closed = await prisma.branch.update({
        where: { id: branchId },
        data: { status: "CLOSED" },
      });
      return { ...closed, softDeleted: true };
    }

    await prisma.branch.delete({ where: { id: branchId } });
    return { id: branchId, deleted: true };
  }
}

export const branchService = new BranchService();
