import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  BadRequestError,
} from "../../utils/AppError.js";
import type {
  CreateRecipeInput,
  UpdateRecipeInput,
  ListRecipesQuery,
} from "./recipe.validation.js";
import { Prisma } from "@prisma/client";

export class RecipeService {
  async create(organizationId: string, input: CreateRecipeInput) {
    const product = await prisma.product.findFirst({
      where: { id: input.productId, organizationId },
    });
    if (!product) throw new BadRequestError("Product not found");

    if (input.variantId) {
      const variant = await prisma.productVariant.findFirst({
        where: { id: input.variantId, productId: input.productId },
      });
      if (!variant) throw new BadRequestError("Variant not found");
    }

    const itemIds = input.ingredients.map((i) => i.inventoryItemId);
    const items = await prisma.inventoryItem.findMany({
      where: { id: { in: itemIds }, organizationId },
    });
    if (items.length !== itemIds.length) {
      throw new BadRequestError("One or more inventory items are invalid");
    }

    const unitIds = input.ingredients.map((i) => i.unitId);
    const units = await prisma.unit.findMany({
      where: { id: { in: unitIds } },
    });
    if (units.length !== new Set(unitIds).size) {
      throw new BadRequestError("One or more units are invalid");
    }

    const recipe = await prisma.$transaction(async (tx) => {
      const created = await tx.recipe.create({
        data: {
          productId: input.productId,
          variantId: input.variantId,
          name: input.name,
          yieldQuantity: input.yieldQuantity,
          isActive: input.isActive ?? true,
        },
      });

      await tx.recipeIngredient.createMany({
        data: input.ingredients.map((ing) => ({
          recipeId: created.id,
          inventoryItemId: ing.inventoryItemId,
          unitId: ing.unitId,
          quantity: ing.quantity,
          wastagePercent: ing.wastagePercent ?? 0,
        })),
      });

      return created;
    });

    return this.getById(organizationId, recipe.id);
  }

  async list(organizationId: string, query: ListRecipesQuery) {
    const { page, limit, productId, isActive } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.RecipeWhereInput = {
      product: { organizationId },
      ...(productId && { productId }),
      ...(isActive !== undefined && { isActive }),
    };

    const [items, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { id: true, name: true, sku: true } },
          variant: { select: { id: true, name: true, sku: true } },
          ingredients: {
            include: {
              inventoryItem: {
                select: { id: true, name: true, sku: true },
              },
              unit: { select: { id: true, code: true, symbol: true } },
            },
          },
        },
      }),
      prisma.recipe.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getById(organizationId: string, id: string) {
    const recipe = await prisma.recipe.findFirst({
      where: { id, product: { organizationId } },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        variant: { select: { id: true, name: true, sku: true } },
        ingredients: {
          include: {
            inventoryItem: {
              select: {
                id: true,
                name: true,
                sku: true,
                standardCost: true,
              },
            },
            unit: { select: { id: true, code: true, name: true, symbol: true } },
          },
        },
      },
    });
    if (!recipe) throw new NotFoundError("Recipe not found");
    return recipe;
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateRecipeInput
  ) {
    const recipe = await prisma.recipe.findFirst({
      where: { id, product: { organizationId } },
    });
    if (!recipe) throw new NotFoundError("Recipe not found");

    if (input.ingredients) {
      const itemIds = input.ingredients.map((i) => i.inventoryItemId);
      const items = await prisma.inventoryItem.findMany({
        where: { id: { in: itemIds }, organizationId },
      });
      if (items.length !== itemIds.length) {
        throw new BadRequestError("One or more inventory items are invalid");
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.recipe.update({
        where: { id },
        data: {
          name: input.name,
          yieldQuantity: input.yieldQuantity,
          isActive: input.isActive,
        },
      });

      if (input.ingredients) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
        await tx.recipeIngredient.createMany({
          data: input.ingredients.map((ing) => ({
            recipeId: id,
            inventoryItemId: ing.inventoryItemId,
            unitId: ing.unitId,
            quantity: ing.quantity,
            wastagePercent: ing.wastagePercent ?? 0,
          })),
        });
      }
    });

    return this.getById(organizationId, id);
  }

  async delete(organizationId: string, id: string) {
    const recipe = await prisma.recipe.findFirst({
      where: { id, product: { organizationId } },
    });
    if (!recipe) throw new NotFoundError("Recipe not found");

    await prisma.recipe.delete({ where: { id } });
    return { id, deleted: true };
  }
}

export const recipeService = new RecipeService();
