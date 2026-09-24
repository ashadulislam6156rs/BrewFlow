import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../../utils/AppError.js";
import type {
  CreateModifierGroupInput,
  UpdateModifierGroupInput,
  CreateModifierInput,
  UpdateModifierInput,
  ListModifierGroupsQuery,
} from "./modifier.validation.js";
import { Prisma } from "@prisma/client";

export class ModifierService {
  async createGroup(organizationId: string, input: CreateModifierGroupInput) {
    const group = await prisma.$transaction(async (tx) => {
      const created = await tx.modifierGroup.create({
        data: {
          organizationId,
          name: input.name,
          description: input.description,
          minSelection: input.minSelection ?? 0,
          maxSelection: input.maxSelection ?? 1,
          isRequired: input.isRequired ?? false,
          isActive: input.isActive ?? true,
          sortOrder: input.sortOrder ?? 0,
        },
      });

      if (input.modifiers && input.modifiers.length > 0) {
        await tx.modifier.createMany({
          data: input.modifiers.map((m, idx) => ({
            modifierGroupId: created.id,
            name: m.name,
            price: m.price ?? 0,
            isActive: m.isActive ?? true,
            sortOrder: m.sortOrder ?? idx,
          })),
        });
      }

      return created;
    });

    return this.getGroupById(organizationId, group.id);
  }

  async listGroups(organizationId: string, query: ListModifierGroupsQuery = {}) {
    const where: Prisma.ModifierGroupWhereInput = {
      organizationId,
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        name: { contains: query.search },
      }),
    };

    const groups = await prisma.modifierGroup.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        modifiers: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
        _count: { select: { products: true } },
      },
    });

    return groups;
  }

  async getGroupById(organizationId: string, id: string) {
    const group = await prisma.modifierGroup.findFirst({
      where: { id, organizationId },
      include: {
        modifiers: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
        products: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        _count: { select: { products: true } },
      },
    });

    if (!group) throw new NotFoundError("Modifier group not found");
    return group;
  }

  async updateGroup(
    organizationId: string,
    id: string,
    input: UpdateModifierGroupInput
  ) {
    const group = await prisma.modifierGroup.findFirst({
      where: { id, organizationId },
    });
    if (!group) throw new NotFoundError("Modifier group not found");

    if (
      input.minSelection !== undefined &&
      input.maxSelection !== undefined &&
      input.minSelection > input.maxSelection
    ) {
      throw new BadRequestError("minSelection cannot be greater than maxSelection");
    }

    await prisma.modifierGroup.update({
      where: { id },
      data: input,
    });

    return this.getGroupById(organizationId, id);
  }

  async deleteGroup(organizationId: string, id: string) {
    const group = await prisma.modifierGroup.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { products: true } } },
    });
    if (!group) throw new NotFoundError("Modifier group not found");

    if (group._count.products > 0) {
      throw new BadRequestError(
        "Cannot delete modifier group that is linked to products"
      );
    }

    await prisma.modifierGroup.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ─── Individual Modifier ─────────────────────────────────
  async createModifier(
    organizationId: string,
    groupId: string,
    input: CreateModifierInput
  ) {
    const group = await prisma.modifierGroup.findFirst({
      where: { id: groupId, organizationId },
    });
    if (!group) throw new NotFoundError("Modifier group not found");

    return prisma.modifier.create({
      data: {
        modifierGroupId: groupId,
        name: input.name,
        price: input.price ?? 0,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
      },
    });
  }

  async updateModifier(
    organizationId: string,
    modifierId: string,
    input: UpdateModifierInput
  ) {
    const modifier = await prisma.modifier.findFirst({
      where: {
        id: modifierId,
        modifierGroup: { organizationId },
      },
    });
    if (!modifier) throw new NotFoundError("Modifier not found");

    return prisma.modifier.update({
      where: { id: modifierId },
      data: input,
    });
  }

  async deleteModifier(organizationId: string, modifierId: string) {
    const modifier = await prisma.modifier.findFirst({
      where: {
        id: modifierId,
        modifierGroup: { organizationId },
      },
    });
    if (!modifier) throw new NotFoundError("Modifier not found");

    await prisma.modifier.delete({ where: { id: modifierId } });
    return { id: modifierId, deleted: true };
  }
}

export const modifierService = new ModifierService();
