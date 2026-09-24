import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ForbiddenError,
} from "../../utils/AppError.js";
import type {
  CreateRoleInput,
  UpdateRoleInput,
  AssignPermissionsInput,
} from "./role.validation.js";

export class RoleService {
  async create(organizationId: string, input: CreateRoleInput) {
    const existing = await prisma.role.findFirst({
      where: {
        organizationId,
        name: input.name,
      },
    });
    if (existing) {
      throw new ConflictError("Role name already exists in this organization");
    }

    const role = await prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          organizationId,
          name: input.name,
          description: input.description,
          scope: input.scope ?? "ORGANIZATION",
          isSystemRole: false,
        },
      });

      if (input.permissionIds && input.permissionIds.length > 0) {
        // Validate permissions exist
        const perms = await tx.permission.findMany({
          where: { id: { in: input.permissionIds } },
        });
        if (perms.length !== input.permissionIds.length) {
          throw new BadRequestError("One or more permission IDs are invalid");
        }

        await tx.rolePermission.createMany({
          data: input.permissionIds.map((permissionId) => ({
            roleId: created.id,
            permissionId,
          })),
        });
      }

      return created;
    });

    return this.getById(organizationId, role.id);
  }

  async list(organizationId: string) {
    const roles = await prisma.role.findMany({
      where: {
        OR: [
          { organizationId },
          { organizationId: null, scope: "SYSTEM" }, // system roles if any
        ],
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: [{ isSystemRole: "desc" }, { name: "asc" }],
    });

    return roles.map((role) => ({
      ...role,
      permissions: role.permissions.map((rp) => rp.permission),
    }));
  }

  async getById(organizationId: string, roleId: string) {
    const role = await prisma.role.findFirst({
      where: {
        id: roleId,
        OR: [{ organizationId }, { organizationId: null }],
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    if (!role) {
      throw new NotFoundError("Role not found");
    }

    return {
      ...role,
      permissions: role.permissions.map((rp) => rp.permission),
    };
  }

  async update(
    organizationId: string,
    roleId: string,
    input: UpdateRoleInput
  ) {
    const role = await prisma.role.findFirst({
      where: { id: roleId, organizationId },
    });

    if (!role) {
      throw new NotFoundError("Role not found");
    }

    if (role.isSystemRole) {
      throw new ForbiddenError("System roles cannot be modified");
    }

    if (input.name && input.name !== role.name) {
      const conflict = await prisma.role.findFirst({
        where: {
          organizationId,
          name: input.name,
          id: { not: roleId },
        },
      });
      if (conflict) {
        throw new ConflictError("Role name already exists");
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.role.update({
        where: { id: roleId },
        data: {
          name: input.name,
          description: input.description,
          scope: input.scope,
        },
      });

      if (input.permissionIds !== undefined) {
        // Replace all permissions
        await tx.rolePermission.deleteMany({ where: { roleId } });

        if (input.permissionIds.length > 0) {
          const perms = await tx.permission.findMany({
            where: { id: { in: input.permissionIds } },
          });
          if (perms.length !== input.permissionIds.length) {
            throw new BadRequestError("One or more permission IDs are invalid");
          }

          await tx.rolePermission.createMany({
            data: input.permissionIds.map((permissionId) => ({
              roleId,
              permissionId,
            })),
          });
        }
      }

      return r;
    });

    return this.getById(organizationId, updated.id);
  }

  async delete(organizationId: string, roleId: string) {
    const role = await prisma.role.findFirst({
      where: { id: roleId, organizationId },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      throw new NotFoundError("Role not found");
    }

    if (role.isSystemRole) {
      throw new ForbiddenError("System roles cannot be deleted");
    }

    if (role._count.users > 0) {
      throw new BadRequestError(
        "Cannot delete role that is assigned to users. Remove users first."
      );
    }

    await prisma.role.delete({ where: { id: roleId } });
    return { id: roleId, deleted: true };
  }

  /**
   * Assign / replace permissions for a role
   */
  async assignPermissions(
    organizationId: string,
    roleId: string,
    input: AssignPermissionsInput
  ) {
    const role = await prisma.role.findFirst({
      where: { id: roleId, organizationId },
    });

    if (!role) {
      throw new NotFoundError("Role not found");
    }

    if (role.isSystemRole) {
      throw new ForbiddenError("Cannot modify permissions of system roles");
    }

    const perms = await prisma.permission.findMany({
      where: { id: { in: input.permissionIds } },
    });
    if (perms.length !== input.permissionIds.length) {
      throw new BadRequestError("One or more permission IDs are invalid");
    }

    await prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      await tx.rolePermission.createMany({
        data: input.permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      });
    });

    return this.getById(organizationId, roleId);
  }
}

export const roleService = new RoleService();
