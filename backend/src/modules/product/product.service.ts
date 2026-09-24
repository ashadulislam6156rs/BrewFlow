import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../../utils/AppError.js";
import type {
  CreateProductInput,
  UpdateProductInput,
  ListProductsQuery,
  CreateVariantInput,
  UpdateVariantInput,
  AddProductImageInput,
  SetProductBranchesInput,
  SetProductModifierGroupsInput,
} from "./product.validation.js";
import { Prisma } from "@prisma/client";

export class ProductService {
  async create(organizationId: string, input: CreateProductInput) {
    // Validate category
    const category = await prisma.category.findFirst({
      where: { id: input.categoryId, organizationId },
    });
    if (!category) throw new BadRequestError("Category not found");

    // Unique slug & sku
    const existing = await prisma.product.findFirst({
      where: {
        organizationId,
        OR: [{ slug: input.slug }, { sku: input.sku }],
      },
    });
    if (existing) {
      if (existing.slug === input.slug)
        throw new ConflictError("Product slug already exists");
      throw new ConflictError("Product SKU already exists");
    }

    if (input.modifierGroupIds?.length) {
      const groups = await prisma.modifierGroup.findMany({
        where: {
          id: { in: input.modifierGroupIds },
          organizationId,
        },
      });
      if (groups.length !== input.modifierGroupIds.length) {
        throw new BadRequestError("One or more modifier group IDs are invalid");
      }
    }

    if (input.branchIds?.length) {
      const branches = await prisma.branch.findMany({
        where: { id: { in: input.branchIds }, organizationId },
      });
      if (branches.length !== input.branchIds.length) {
        throw new BadRequestError("One or more branch IDs are invalid");
      }
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          organizationId,
          categoryId: input.categoryId,
          name: input.name,
          slug: input.slug,
          sku: input.sku,
          barcode: input.barcode,
          description: input.description,
          productType: input.productType ?? "FOOD",
          status: input.status ?? "DRAFT",
          basePrice: input.basePrice,
          costPrice: input.costPrice,
          taxRateId: input.taxRateId,
          isFeatured: input.isFeatured ?? false,
          isAvailable: input.isAvailable ?? true,
          trackInventory: input.trackInventory ?? true,
          prepTimeMin: input.prepTimeMin,
          sortOrder: input.sortOrder ?? 0,
        },
      });

      if (input.variants?.length) {
        await tx.productVariant.createMany({
          data: input.variants.map((v) => ({
            productId: created.id,
            name: v.name,
            sku: v.sku,
            barcode: v.barcode,
            price: v.price,
            costPrice: v.costPrice,
            isDefault: v.isDefault ?? false,
            isActive: v.isActive ?? true,
          })),
        });
      }

      if (input.imageAssetIds?.length) {
        await tx.productImage.createMany({
          data: input.imageAssetIds.map((assetId, idx) => ({
            productId: created.id,
            assetId,
            sortOrder: idx,
            isPrimary: idx === 0,
          })),
        });
      }

      if (input.modifierGroupIds?.length) {
        await tx.productModifierGroup.createMany({
          data: input.modifierGroupIds.map((modifierGroupId, idx) => ({
            productId: created.id,
            modifierGroupId,
            sortOrder: idx,
          })),
        });
      }

      if (input.branchIds?.length) {
        await tx.productBranch.createMany({
          data: input.branchIds.map((branchId) => ({
            productId: created.id,
            branchId,
            isAvailable: true,
          })),
        });
      }

      return created;
    });

    return this.getById(organizationId, product.id);
  }

  async list(organizationId: string, query: ListProductsQuery) {
    const { page, limit, status, categoryId, productType, isFeatured, isAvailable, search, branchId } =
      query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      organizationId,
      ...(status && { status }),
      ...(categoryId && { categoryId }),
      ...(productType && { productType }),
      ...(isFeatured !== undefined && { isFeatured }),
      ...(isAvailable !== undefined && { isAvailable }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { sku: { contains: search } },
          { slug: { contains: search } },
          { barcode: { contains: search } },
        ],
      }),
      ...(branchId && {
        branchSettings: { some: { branchId } },
      }),
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        include: {
          category: { select: { id: true, name: true, slug: true } },
          images: {
            orderBy: { sortOrder: "asc" },
            include: {
              asset: {
                select: { id: true, publicId: true, secureUrl: true },
              },
            },
          },
          variants: {
            where: { isActive: true },
            orderBy: { createdAt: "asc" },
          },
          _count: {
            select: {
              variants: true,
              branchSettings: true,
              reviews: true,
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getById(organizationId: string, id: string) {
    const product = await prisma.product.findFirst({
      where: { id, organizationId },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: {
          orderBy: { sortOrder: "asc" },
          include: {
            asset: {
              select: { id: true, publicId: true, secureUrl: true, width: true, height: true },
            },
          },
        },
        variants: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        },
        branchSettings: {
          include: {
            branch: {
              select: { id: true, name: true, code: true, status: true },
            },
          },
        },
        modifierGroups: {
          orderBy: { sortOrder: "asc" },
          include: {
            modifierGroup: {
              include: {
                modifiers: {
                  where: { isActive: true },
                  orderBy: { sortOrder: "asc" },
                },
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true,
            reviews: true,
            orderItems: true,
          },
        },
      },
    });

    if (!product) throw new NotFoundError("Product not found");
    return product;
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateProductInput
  ) {
    const product = await prisma.product.findFirst({
      where: { id, organizationId },
    });
    if (!product) throw new NotFoundError("Product not found");

    if (input.categoryId) {
      const cat = await prisma.category.findFirst({
        where: { id: input.categoryId, organizationId },
      });
      if (!cat) throw new BadRequestError("Category not found");
    }

    if (input.slug || input.sku) {
      const conflict = await prisma.product.findFirst({
        where: {
          organizationId,
          id: { not: id },
          OR: [
            ...(input.slug ? [{ slug: input.slug }] : []),
            ...(input.sku ? [{ sku: input.sku }] : []),
          ],
        },
      });
      if (conflict) {
        if (input.slug && conflict.slug === input.slug)
          throw new ConflictError("Product slug already exists");
        throw new ConflictError("Product SKU already exists");
      }
    }

    await prisma.product.update({
      where: { id },
      data: input,
    });

    return this.getById(organizationId, id);
  }

  async delete(organizationId: string, id: string) {
    const product = await prisma.product.findFirst({
      where: { id, organizationId },
      include: { _count: { select: { orderItems: true, cartItems: true } } },
    });
    if (!product) throw new NotFoundError("Product not found");

    if (product._count.orderItems > 0 || product._count.cartItems > 0) {
      // Soft archive
      const archived = await prisma.product.update({
        where: { id },
        data: { status: "ARCHIVED", isAvailable: false },
      });
      return { ...archived, softDeleted: true };
    }

    await prisma.product.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ─── Variants ────────────────────────────────────────────
  async addVariant(
    organizationId: string,
    productId: string,
    input: CreateVariantInput
  ) {
    const product = await prisma.product.findFirst({
      where: { id: productId, organizationId },
    });
    if (!product) throw new NotFoundError("Product not found");

    const existingSku = await prisma.productVariant.findUnique({
      where: { productId_sku: { productId, sku: input.sku } },
    });
    if (existingSku) throw new ConflictError("Variant SKU already exists");

    if (input.isDefault) {
      await prisma.productVariant.updateMany({
        where: { productId },
        data: { isDefault: false },
      });
    }

    return prisma.productVariant.create({
      data: {
        productId,
        name: input.name,
        sku: input.sku,
        barcode: input.barcode,
        price: input.price,
        costPrice: input.costPrice,
        isDefault: input.isDefault ?? false,
        isActive: input.isActive ?? true,
      },
    });
  }

  async updateVariant(
    organizationId: string,
    productId: string,
    variantId: string,
    input: UpdateVariantInput
  ) {
    const variant = await prisma.productVariant.findFirst({
      where: {
        id: variantId,
        productId,
        product: { organizationId },
      },
    });
    if (!variant) throw new NotFoundError("Variant not found");

    if (input.sku && input.sku !== variant.sku) {
      const conflict = await prisma.productVariant.findUnique({
        where: { productId_sku: { productId, sku: input.sku } },
      });
      if (conflict) throw new ConflictError("Variant SKU already exists");
    }

    if (input.isDefault) {
      await prisma.productVariant.updateMany({
        where: { productId, id: { not: variantId } },
        data: { isDefault: false },
      });
    }

    return prisma.productVariant.update({
      where: { id: variantId },
      data: input,
    });
  }

  async deleteVariant(
    organizationId: string,
    productId: string,
    variantId: string
  ) {
    const variant = await prisma.productVariant.findFirst({
      where: {
        id: variantId,
        productId,
        product: { organizationId },
      },
    });
    if (!variant) throw new NotFoundError("Variant not found");

    await prisma.productVariant.delete({ where: { id: variantId } });
    return { id: variantId, deleted: true };
  }

  // ─── Images ──────────────────────────────────────────────
  async addImage(
    organizationId: string,
    productId: string,
    input: AddProductImageInput
  ) {
    const product = await prisma.product.findFirst({
      where: { id: productId, organizationId },
    });
    if (!product) throw new NotFoundError("Product not found");

    const asset = await prisma.cloudinaryAsset.findUnique({
      where: { id: input.assetId },
    });
    if (!asset) throw new BadRequestError("Asset not found");

    if (input.isPrimary) {
      await prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }

    return prisma.productImage.create({
      data: {
        productId,
        assetId: input.assetId,
        sortOrder: input.sortOrder ?? 0,
        isPrimary: input.isPrimary ?? false,
        altText: input.altText,
      },
      include: {
        asset: { select: { id: true, publicId: true, secureUrl: true } },
      },
    });
  }

  async removeImage(
    organizationId: string,
    productId: string,
    imageId: string
  ) {
    const image = await prisma.productImage.findFirst({
      where: {
        id: imageId,
        productId,
        product: { organizationId },
      },
    });
    if (!image) throw new NotFoundError("Product image not found");

    await prisma.productImage.delete({ where: { id: imageId } });
    return { id: imageId, deleted: true };
  }

  // ─── Branch settings ─────────────────────────────────────
  async setBranches(
    organizationId: string,
    productId: string,
    input: SetProductBranchesInput
  ) {
    const product = await prisma.product.findFirst({
      where: { id: productId, organizationId },
    });
    if (!product) throw new NotFoundError("Product not found");

    const branchIds = input.branches.map((b) => b.branchId);
    const branches = await prisma.branch.findMany({
      where: { id: { in: branchIds }, organizationId },
    });
    if (branches.length !== branchIds.length) {
      throw new BadRequestError("One or more branch IDs are invalid");
    }

    await prisma.$transaction(async (tx) => {
      await tx.productBranch.deleteMany({ where: { productId } });
      if (input.branches.length > 0) {
        await tx.productBranch.createMany({
          data: input.branches.map((b) => ({
            productId,
            branchId: b.branchId,
            price: b.price,
            costPrice: b.costPrice,
            isAvailable: b.isAvailable ?? true,
            isFeatured: b.isFeatured ?? false,
            inventoryMode: b.inventoryMode ?? "NONE",
            prepTimeMin: b.prepTimeMin,
          })),
        });
      }
    });

    return this.getById(organizationId, productId);
  }

  // ─── Modifier groups ─────────────────────────────────────
  async setModifierGroups(
    organizationId: string,
    productId: string,
    input: SetProductModifierGroupsInput
  ) {
    const product = await prisma.product.findFirst({
      where: { id: productId, organizationId },
    });
    if (!product) throw new NotFoundError("Product not found");

    if (input.modifierGroupIds.length > 0) {
      const groups = await prisma.modifierGroup.findMany({
        where: {
          id: { in: input.modifierGroupIds },
          organizationId,
        },
      });
      if (groups.length !== input.modifierGroupIds.length) {
        throw new BadRequestError("One or more modifier group IDs are invalid");
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.productModifierGroup.deleteMany({ where: { productId } });
      if (input.modifierGroupIds.length > 0) {
        await tx.productModifierGroup.createMany({
          data: input.modifierGroupIds.map((modifierGroupId, idx) => ({
            productId,
            modifierGroupId,
            sortOrder: idx,
          })),
        });
      }
    });

    return this.getById(organizationId, productId);
  }
}

export const productService = new ProductService();
