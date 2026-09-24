import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  BadRequestError,
} from "../../utils/AppError.js";
import type {
  GetOrCreateCartInput,
  AddCartItemInput,
  UpdateCartItemInput,
} from "./cart.validation.js";
import crypto from "crypto";

export class CartService {
  async getOrCreate(organizationId: string, input: GetOrCreateCartInput) {
    if (input.sessionToken) {
      const existing = await prisma.cart.findUnique({
        where: { sessionToken: input.sessionToken },
        include: this.cartInclude(),
      });
      if (existing && existing.organizationId === organizationId) {
        return existing;
      }
    }

    const sessionToken = input.sessionToken || crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return prisma.cart.create({
      data: {
        organizationId,
        sessionToken,
        customerId: input.customerId,
        branchId: input.branchId,
        expiresAt,
      },
      include: this.cartInclude(),
    });
  }

  async getByToken(organizationId: string, token: string) {
    const cart = await prisma.cart.findFirst({
      where: { sessionToken: token, organizationId },
      include: this.cartInclude(),
    });
    if (!cart) throw new NotFoundError("Cart not found");
    return cart;
  }

  async addItem(
    organizationId: string,
    token: string,
    input: AddCartItemInput
  ) {
    const cart = await this.getByToken(organizationId, token);

    const product = await prisma.product.findFirst({
      where: {
        id: input.productId,
        organizationId,
        status: "ACTIVE",
      },
      include: {
        variants: input.variantId
          ? { where: { id: input.variantId } }
          : false,
      },
    });
    if (!product) throw new BadRequestError("Product not found or inactive");

    let unitPrice = Number(input.unitPrice ?? product.basePrice);
    if (input.variantId) {
      const variant = await prisma.productVariant.findFirst({
        where: { id: input.variantId, productId: product.id, isActive: true },
      });
      if (!variant) throw new BadRequestError("Variant not found");
      unitPrice = Number(input.unitPrice ?? variant.price);
    }

    // Merge if same product+variant already in cart
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: input.productId,
        variantId: input.variantId ?? null,
      },
    });

    if (existingItem) {
      const newQty = Number(existingItem.quantity) + Number(input.quantity);
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQty,
          unitPrice,
          modifierSnapshot: input.modifierSnapshot ?? existingItem.modifierSnapshot,
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: input.productId,
          variantId: input.variantId,
          quantity: input.quantity,
          unitPrice,
          modifierSnapshot: input.modifierSnapshot,
        },
      });
    }

    return this.getByToken(organizationId, token);
  }

  async updateItem(
    organizationId: string,
    token: string,
    itemId: string,
    input: UpdateCartItemInput
  ) {
    const cart = await this.getByToken(organizationId, token);

    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) throw new NotFoundError("Cart item not found");

    await prisma.cartItem.update({
      where: { id: itemId },
      data: {
        quantity: input.quantity,
        ...(input.modifierSnapshot !== undefined && {
          modifierSnapshot: input.modifierSnapshot,
        }),
      },
    });

    return this.getByToken(organizationId, token);
  }

  async removeItem(organizationId: string, token: string, itemId: string) {
    const cart = await this.getByToken(organizationId, token);

    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
    });
    if (!item) throw new NotFoundError("Cart item not found");

    await prisma.cartItem.delete({ where: { id: itemId } });
    return this.getByToken(organizationId, token);
  }

  async clear(organizationId: string, token: string) {
    const cart = await this.getByToken(organizationId, token);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.getByToken(organizationId, token);
  }

  private cartInclude() {
    return {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              sku: true,
              basePrice: true,
              status: true,
              images: {
                where: { isPrimary: true },
                take: 1,
                include: {
                  asset: {
                    select: { secureUrl: true },
                  },
                },
              },
            },
          },
          variant: {
            select: { id: true, name: true, sku: true, price: true },
          },
        },
        orderBy: { createdAt: "asc" as const },
      },
      customer: {
        select: { id: true, name: true, phone: true },
      },
      branch: {
        select: { id: true, name: true, code: true },
      },
    };
  }
}

export const cartService = new CartService();
