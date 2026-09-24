import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../../utils/AppError.js";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  ListCategoriesQuery,
} from "./category.validation.js";
import { Prisma } from "@prisma/client";

export class CategoryService {
  async create(organizationId: string, input: CreateCategoryInput) {
    const existing = await prisma.category.findUnique({
      where: {
        organizationId_slug: { organizationId, slug: input.slug },
      },
    });
    if (existing) throw new ConflictError("Category slug already exists");

    if (input.parentId) {
      const parent = await prisma.category.findFirst({
        where: { id: input.parentId, organizationId },
      });
      if (!parent) throw new BadRequestError("Parent category not found");
    }

    return prisma.category.create({
      data: {
        organizationId,
        name: input.name,
        slug: input.slug,
        description: input.description,
        parentId: input.parentId,
        imageAssetId: input.imageAssetId,
        status: input.status ?? "ACTIVE",
        sortOrder: input.sortOrder ?? 0,
      },
      include: {
        imageAsset: { select: { id: true, publicId: true, secureUrl: true } },
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true, children: true } },
      },
    });
  }

  async list(organizationId: string, query: ListCategoriesQuery) {
    const where: Prisma.CategoryWhereInput = {
      organizationId,
      ...(query.status && { status: query.status }),
      ...(query.parentId !== undefined && {
        parentId: query.parentId === null ? null : query.parentId,
      }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search } },
          { slug: { contains: query.search } },
        ],
      }),
    };

    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        imageAsset: { select: { id: true, publicId: true, secureUrl: true } },
        parent: { select: { id: true, name: true, slug: true } },
        children: query.flat
          ? false
          : {
              orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
              include: {
                imageAsset: {
                  select: { id: true, publicId: true, secureUrl: true },
                },
                _count: { select: { products: true } },
              },
            },
        _count: { select: { products: true, children: true } },
      },
    });

    // If not flat and no parentId filter, return only root categories (tree)
    if (!query.flat && query.parentId === undefined && !query.search) {
      return categories.filter((c) => !c.parentId);
    }

    return categories;
  }

  async getById(organizationId: string, id: string) {
    const category = await prisma.category.findFirst({
      where: { id, organizationId },
      include: {
        imageAsset: { select: { id: true, publicId: true, secureUrl: true } },
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          include: {
            imageAsset: {
              select: { id: true, publicId: true, secureUrl: true },
            },
            _count: { select: { products: true } },
          },
        },
        _count: { select: { products: true } },
      },
    });

    if (!category) throw new NotFoundError("Category not found");
    return category;
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateCategoryInput
  ) {
    const category = await prisma.category.findFirst({
      where: { id, organizationId },
    });
    if (!category) throw new NotFoundError("Category not found");

    if (input.slug && input.slug !== category.slug) {
      const conflict = await prisma.category.findUnique({
        where: {
          organizationId_slug: { organizationId, slug: input.slug },
        },
      });
      if (conflict) throw new ConflictError("Category slug already exists");
    }

    if (input.parentId) {
      if (input.parentId === id) {
        throw new BadRequestError("Category cannot be its own parent");
      }
      const parent = await prisma.category.findFirst({
        where: { id: input.parentId, organizationId },
      });
      if (!parent) throw new BadRequestError("Parent category not found");
    }

    return prisma.category.update({
      where: { id },
      data: input,
      include: {
        imageAsset: { select: { id: true, publicId: true, secureUrl: true } },
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true, children: true } },
      },
    });
  }

  async delete(organizationId: string, id: string) {
    const category = await prisma.category.findFirst({
      where: { id, organizationId },
      include: {
        _count: { select: { products: true, children: true } },
      },
    });
    if (!category) throw new NotFoundError("Category not found");

    if (category._count.products > 0) {
      throw new BadRequestError(
        "Cannot delete category with products. Move or delete products first."
      );
    }
    if (category._count.children > 0) {
      throw new BadRequestError(
        "Cannot delete category with sub-categories. Delete children first."
      );
    }

    await prisma.category.delete({ where: { id } });
    return { id, deleted: true };
  }
}

export const categoryService = new CategoryService();
