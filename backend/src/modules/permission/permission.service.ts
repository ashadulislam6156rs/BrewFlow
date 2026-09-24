import { prisma } from "../../config/database.js";
import { ConflictError, NotFoundError } from "../../utils/AppError.js";
import type {
  CreatePermissionInput,
  ListPermissionsQuery,
} from "./permission.validation.js";
import { Prisma } from "@prisma/client";

export class PermissionService {
  /**
   * List all permissions (system-wide, not org-scoped)
   */
  async list(query: ListPermissionsQuery = {}) {
    const where: Prisma.PermissionWhereInput = {
      ...(query.module && { module: query.module }),
      ...(query.search && {
        OR: [
          { code: { contains: query.search } },
          { name: { contains: query.search } },
        ],
      }),
    };

    const permissions = await prisma.permission.findMany({
      where,
      orderBy: [{ module: "asc" }, { code: "asc" }],
    });

    return permissions;
  }

  /**
   * Get distinct modules
   */
  async getModules() {
    const result = await prisma.permission.findMany({
      select: { module: true },
      distinct: ["module"],
      orderBy: { module: "asc" },
    });
    return result.map((r) => r.module).filter(Boolean);
  }

  /**
   * Create a new permission (usually done via seed, but available for admin)
   */
  async create(input: CreatePermissionInput) {
    const existing = await prisma.permission.findUnique({
      where: { code: input.code },
    });
    if (existing) {
      throw new ConflictError("Permission code already exists");
    }

    return prisma.permission.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        module: input.module,
      },
    });
  }

  async getById(id: string) {
    const permission = await prisma.permission.findUnique({
      where: { id },
    });
    if (!permission) {
      throw new NotFoundError("Permission not found");
    }
    return permission;
  }
}

export const permissionService = new PermissionService();
