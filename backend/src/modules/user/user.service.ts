import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ForbiddenError,
} from "../../utils/AppError.js";
import { hashPassword } from "../../utils/password.js";
import type {
  CreateUserInput,
  UpdateUserInput,
  ListUsersQuery,
  AssignRolesInput,
  AssignBranchesInput,
} from "./user.validation.js";
import { Prisma } from "@prisma/client";

export class UserService {
  private sanitize(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async create(organizationId: string, input: CreateUserInput) {
    // Check email uniqueness within org
    const existing = await prisma.user.findUnique({
      where: {
        organizationId_email: {
          organizationId,
          email: input.email,
        },
      },
    });
    if (existing) {
      throw new ConflictError("Email already exists in this organization");
    }

    // Validate roles belong to this org
    if (input.roleIds && input.roleIds.length > 0) {
      const roles = await prisma.role.findMany({
        where: {
          id: { in: input.roleIds },
          OR: [{ organizationId }, { organizationId: null }],
        },
      });
      if (roles.length !== input.roleIds.length) {
        throw new BadRequestError("One or more role IDs are invalid");
      }
    }

    // Validate branches belong to this org
    if (input.branchIds && input.branchIds.length > 0) {
      const branches = await prisma.branch.findMany({
        where: {
          id: { in: input.branchIds },
          organizationId,
        },
      });
      if (branches.length !== input.branchIds.length) {
        throw new BadRequestError("One or more branch IDs are invalid");
      }
    }

    if (
      input.primaryBranchId &&
      input.branchIds &&
      !input.branchIds.includes(input.primaryBranchId)
    ) {
      throw new BadRequestError("Primary branch must be one of the assigned branches");
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          organizationId,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          passwordHash,
          status: input.status ?? "ACTIVE",
        },
      });

      if (input.roleIds && input.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: input.roleIds.map((roleId) => ({
            userId: created.id,
            roleId,
          })),
        });
      }

      if (input.branchIds && input.branchIds.length > 0) {
        await tx.userBranch.createMany({
          data: input.branchIds.map((branchId) => ({
            userId: created.id,
            branchId,
            isPrimary: branchId === input.primaryBranchId,
          })),
        });
      }

      return created;
    });

    return this.getById(organizationId, user.id);
  }

  async list(organizationId: string, query: ListUsersQuery) {
    const { page, limit, status, search, branchId, roleId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      organizationId,
      ...(status && { status }),
      ...(search && {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
        ],
      }),
      ...(branchId && {
        branches: { some: { branchId } },
      }),
      ...(roleId && {
        roles: { some: { roleId } },
      }),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          roles: {
            include: {
              role: {
                select: { id: true, name: true, scope: true, isSystemRole: true },
              },
            },
          },
          branches: {
            include: {
              branch: {
                select: { id: true, name: true, code: true, status: true },
              },
            },
          },
          avatarAsset: {
            select: { id: true, publicId: true, secureUrl: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items: items.map((u) => this.sanitize(u)),
      total,
      page,
      limit,
    };
  }

  async getById(organizationId: string, userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        branches: {
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                code: true,
                slug: true,
                status: true,
                city: true,
              },
            },
          },
        },
        avatarAsset: {
          select: { id: true, publicId: true, secureUrl: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const sanitized = this.sanitize(user);

    return {
      ...sanitized,
      roles: user.roles.map((ur) => ({
        ...ur.role,
        permissions: ur.role.permissions.map((rp) => rp.permission),
      })),
      branches: user.branches.map((ub) => ({
        ...ub.branch,
        isPrimary: ub.isPrimary,
      })),
    };
  }

  async update(
    organizationId: string,
    userId: string,
    input: UpdateUserInput,
    requesterId: string
  ) {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Prevent self-suspension if last owner (simple check)
    if (
      input.status &&
      input.status !== "ACTIVE" &&
      userId === requesterId
    ) {
      // allow for now, but could add stronger check later
    }

    // Validate roles
    if (input.roleIds !== undefined) {
      if (input.roleIds.length > 0) {
        const roles = await prisma.role.findMany({
          where: {
            id: { in: input.roleIds },
            OR: [{ organizationId }, { organizationId: null }],
          },
        });
        if (roles.length !== input.roleIds.length) {
          throw new BadRequestError("One or more role IDs are invalid");
        }
      }
    }

    // Validate branches
    if (input.branchIds !== undefined) {
      if (input.branchIds.length > 0) {
        const branches = await prisma.branch.findMany({
          where: {
            id: { in: input.branchIds },
            organizationId,
          },
        });
        if (branches.length !== input.branchIds.length) {
          throw new BadRequestError("One or more branch IDs are invalid");
        }
      }
    }

    if (
      input.primaryBranchId &&
      input.branchIds &&
      !input.branchIds.includes(input.primaryBranchId)
    ) {
      throw new BadRequestError("Primary branch must be one of the assigned branches");
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          status: input.status,
        },
      });

      if (input.roleIds !== undefined) {
        await tx.userRole.deleteMany({ where: { userId } });
        if (input.roleIds.length > 0) {
          await tx.userRole.createMany({
            data: input.roleIds.map((roleId) => ({
              userId,
              roleId,
            })),
          });
        }
      }

      if (input.branchIds !== undefined) {
        await tx.userBranch.deleteMany({ where: { userId } });
        if (input.branchIds.length > 0) {
          await tx.userBranch.createMany({
            data: input.branchIds.map((branchId) => ({
              userId,
              branchId,
              isPrimary: branchId === input.primaryBranchId,
            })),
          });
        }
      } else if (input.primaryBranchId !== undefined) {
        // Only update primary flag
        await tx.userBranch.updateMany({
          where: { userId },
          data: { isPrimary: false },
        });
        if (input.primaryBranchId) {
          await tx.userBranch.updateMany({
            where: { userId, branchId: input.primaryBranchId },
            data: { isPrimary: true },
          });
        }
      }
    });

    return this.getById(organizationId, userId);
  }

  async delete(organizationId: string, userId: string, requesterId: string) {
    if (userId === requesterId) {
      throw new BadRequestError("You cannot delete your own account");
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Soft delete by suspending
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: "SUSPENDED" },
    });

    return this.sanitize(updated);
  }

  async assignRoles(
    organizationId: string,
    userId: string,
    input: AssignRolesInput
  ) {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
    });
    if (!user) throw new NotFoundError("User not found");

    const roles = await prisma.role.findMany({
      where: {
        id: { in: input.roleIds },
        OR: [{ organizationId }, { organizationId: null }],
      },
    });
    if (roles.length !== input.roleIds.length) {
      throw new BadRequestError("One or more role IDs are invalid");
    }

    await prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } });
      await tx.userRole.createMany({
        data: input.roleIds.map((roleId) => ({ userId, roleId })),
      });
    });

    return this.getById(organizationId, userId);
  }

  async assignBranches(
    organizationId: string,
    userId: string,
    input: AssignBranchesInput
  ) {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
    });
    if (!user) throw new NotFoundError("User not found");

    const branches = await prisma.branch.findMany({
      where: {
        id: { in: input.branchIds },
        organizationId,
      },
    });
    if (branches.length !== input.branchIds.length) {
      throw new BadRequestError("One or more branch IDs are invalid");
    }

    if (
      input.primaryBranchId &&
      !input.branchIds.includes(input.primaryBranchId)
    ) {
      throw new BadRequestError("Primary branch must be one of the assigned branches");
    }

    await prisma.$transaction(async (tx) => {
      await tx.userBranch.deleteMany({ where: { userId } });
      await tx.userBranch.createMany({
        data: input.branchIds.map((branchId) => ({
          userId,
          branchId,
          isPrimary: branchId === input.primaryBranchId,
        })),
      });
    });

    return this.getById(organizationId, userId);
  }
}

export const userService = new UserService();
