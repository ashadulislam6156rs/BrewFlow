import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../../utils/AppError.js";
import type {
  CreateTaxRateInput,
  UpdateTaxRateInput,
  CreateDiscountInput,
  UpdateDiscountInput,
  CreatePromotionInput,
  UpdatePromotionInput,
  CreateCouponInput,
  UpdateCouponInput,
  ValidateCouponInput,
  RedeemCouponInput,
  ListQuery,
} from "./marketing.validation.js";
import { Prisma } from "@prisma/client";

export class MarketingService {
  // ═══════════════════════════════════════════════════════════
  // TaxRate
  // ═══════════════════════════════════════════════════════════
  async createTaxRate(organizationId: string, input: CreateTaxRateInput) {
    const existing = await prisma.taxRate.findUnique({
      where: {
        organizationId_name: { organizationId, name: input.name },
      },
    });
    if (existing) throw new ConflictError("Tax rate name already exists");

    return prisma.taxRate.create({
      data: {
        organizationId,
        name: input.name,
        code: input.code,
        type: input.type,
        rate: input.rate,
        isInclusive: input.isInclusive ?? false,
        isActive: input.isActive ?? true,
      },
    });
  }

  async listTaxRates(organizationId: string, query: ListQuery) {
    const where: Prisma.TaxRateWhereInput = {
      organizationId,
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && { name: { contains: query.search } }),
    };

    const [items, total] = await Promise.all([
      prisma.taxRate.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { name: "asc" },
      }),
      prisma.taxRate.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async updateTaxRate(
    organizationId: string,
    id: string,
    input: UpdateTaxRateInput
  ) {
    const tax = await prisma.taxRate.findFirst({
      where: { id, organizationId },
    });
    if (!tax) throw new NotFoundError("Tax rate not found");

    if (input.name && input.name !== tax.name) {
      const conflict = await prisma.taxRate.findUnique({
        where: {
          organizationId_name: { organizationId, name: input.name },
        },
      });
      if (conflict) throw new ConflictError("Tax rate name already exists");
    }

    return prisma.taxRate.update({ where: { id }, data: input });
  }

  async deleteTaxRate(organizationId: string, id: string) {
    const tax = await prisma.taxRate.findFirst({
      where: { id, organizationId },
    });
    if (!tax) throw new NotFoundError("Tax rate not found");

    await prisma.taxRate.update({
      where: { id },
      data: { isActive: false },
    });
    return { id, deactivated: true };
  }

  // ═══════════════════════════════════════════════════════════
  // Discount
  // ═══════════════════════════════════════════════════════════
  async createDiscount(organizationId: string, input: CreateDiscountInput) {
    if (input.type === "PERCENTAGE" && Number(input.value) > 100) {
      throw new BadRequestError("Percentage discount cannot exceed 100");
    }

    return prisma.discount.create({
      data: {
        organizationId,
        name: input.name,
        type: input.type,
        value: input.value,
        maxDiscount: input.maxDiscount,
        minOrderAmount: input.minOrderAmount,
        isActive: input.isActive ?? true,
      },
    });
  }

  async listDiscounts(organizationId: string, query: ListQuery) {
    const where: Prisma.DiscountWhereInput = {
      organizationId,
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && { name: { contains: query.search } }),
    };

    const [items, total] = await Promise.all([
      prisma.discount.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { name: "asc" },
      }),
      prisma.discount.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async updateDiscount(
    organizationId: string,
    id: string,
    input: UpdateDiscountInput
  ) {
    const discount = await prisma.discount.findFirst({
      where: { id, organizationId },
    });
    if (!discount) throw new NotFoundError("Discount not found");

    if (
      (input.type === "PERCENTAGE" || discount.type === "PERCENTAGE") &&
      input.value !== undefined &&
      Number(input.value) > 100
    ) {
      throw new BadRequestError("Percentage discount cannot exceed 100");
    }

    return prisma.discount.update({ where: { id }, data: input });
  }

  async deleteDiscount(organizationId: string, id: string) {
    const discount = await prisma.discount.findFirst({
      where: { id, organizationId },
    });
    if (!discount) throw new NotFoundError("Discount not found");

    await prisma.discount.update({
      where: { id },
      data: { isActive: false },
    });
    return { id, deactivated: true };
  }

  // ═══════════════════════════════════════════════════════════
  // Promotion
  // ═══════════════════════════════════════════════════════════
  async createPromotion(organizationId: string, input: CreatePromotionInput) {
    return prisma.promotion.create({
      data: {
        organizationId,
        name: input.name,
        description: input.description,
        status: input.status ?? "DRAFT",
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        rules: input.rules ?? undefined,
        reward: input.reward ?? undefined,
      },
    });
  }

  async listPromotions(organizationId: string, query: ListQuery) {
    const where: Prisma.PromotionWhereInput = {
      organizationId,
      ...(query.status && { status: query.status as any }),
      ...(query.search && { name: { contains: query.search } }),
    };

    const [items, total] = await Promise.all([
      prisma.promotion.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.promotion.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async updatePromotion(
    organizationId: string,
    id: string,
    input: UpdatePromotionInput
  ) {
    const promo = await prisma.promotion.findFirst({
      where: { id, organizationId },
    });
    if (!promo) throw new NotFoundError("Promotion not found");

    return prisma.promotion.update({
      where: { id },
      data: {
        ...input,
        rules: input.rules ?? undefined,
        reward: input.reward ?? undefined,
      },
    });
  }

  async deletePromotion(organizationId: string, id: string) {
    const promo = await prisma.promotion.findFirst({
      where: { id, organizationId },
    });
    if (!promo) throw new NotFoundError("Promotion not found");

    await prisma.promotion.update({
      where: { id },
      data: { status: "INACTIVE" },
    });
    return { id, deactivated: true };
  }

  // ═══════════════════════════════════════════════════════════
  // Coupon
  // ═══════════════════════════════════════════════════════════
  async createCoupon(organizationId: string, input: CreateCouponInput) {
    if (input.discountType === "PERCENTAGE" && Number(input.discountValue) > 100) {
      throw new BadRequestError("Percentage cannot exceed 100");
    }

    const existing = await prisma.coupon.findUnique({
      where: {
        organizationId_code: { organizationId, code: input.code },
      },
    });
    if (existing) throw new ConflictError("Coupon code already exists");

    return prisma.coupon.create({
      data: {
        organizationId,
        code: input.code,
        description: input.description,
        discountType: input.discountType,
        discountValue: input.discountValue,
        minimumOrder: input.minimumOrder,
        maximumDiscount: input.maximumDiscount,
        usageLimit: input.usageLimit,
        perCustomerLimit: input.perCustomerLimit,
        startsAt: input.startsAt,
        expiresAt: input.expiresAt,
        status: input.status ?? "ACTIVE",
      },
    });
  }

  async listCoupons(organizationId: string, query: ListQuery) {
    const where: Prisma.CouponWhereInput = {
      organizationId,
      ...(query.status && { status: query.status as any }),
      ...(query.search && {
        OR: [
          { code: { contains: query.search } },
          { description: { contains: query.search } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { redemptions: true } },
        },
      }),
      prisma.coupon.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async getCoupon(organizationId: string, id: string) {
    const coupon = await prisma.coupon.findFirst({
      where: { id, organizationId },
      include: {
        redemptions: {
          take: 50,
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { redemptions: true } },
      },
    });
    if (!coupon) throw new NotFoundError("Coupon not found");
    return coupon;
  }

  async updateCoupon(
    organizationId: string,
    id: string,
    input: UpdateCouponInput
  ) {
    const coupon = await prisma.coupon.findFirst({
      where: { id, organizationId },
    });
    if (!coupon) throw new NotFoundError("Coupon not found");

    if (input.code && input.code !== coupon.code) {
      const conflict = await prisma.coupon.findUnique({
        where: {
          organizationId_code: { organizationId, code: input.code },
        },
      });
      if (conflict) throw new ConflictError("Coupon code already exists");
    }

    return prisma.coupon.update({ where: { id }, data: input });
  }

  async deleteCoupon(organizationId: string, id: string) {
    const coupon = await prisma.coupon.findFirst({
      where: { id, organizationId },
    });
    if (!coupon) throw new NotFoundError("Coupon not found");

    await prisma.coupon.update({
      where: { id },
      data: { status: "INACTIVE" },
    });
    return { id, deactivated: true };
  }

  /**
   * Validate coupon and compute discount amount (does not redeem)
   */
  async validateCoupon(organizationId: string, input: ValidateCouponInput) {
    const code = input.code.toUpperCase();
    const coupon = await prisma.coupon.findUnique({
      where: {
        organizationId_code: { organizationId, code },
      },
    });

    if (!coupon) throw new NotFoundError("Invalid coupon code");
    if (coupon.status !== "ACTIVE") {
      throw new BadRequestError(`Coupon is ${coupon.status.toLowerCase()}`);
    }

    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      throw new BadRequestError("Coupon is not yet active");
    }
    if (coupon.expiresAt && coupon.expiresAt < now) {
      throw new BadRequestError("Coupon has expired");
    }

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestError("Coupon usage limit reached");
    }

    const orderAmount = Number(input.orderAmount);
    if (coupon.minimumOrder && orderAmount < Number(coupon.minimumOrder)) {
      throw new BadRequestError(
        `Minimum order amount is ${coupon.minimumOrder}`
      );
    }

    if (input.customerId && coupon.perCustomerLimit) {
      const customerUses = await prisma.couponRedemption.count({
        where: {
          couponId: coupon.id,
          customerId: input.customerId,
        },
      });
      if (customerUses >= coupon.perCustomerLimit) {
        throw new BadRequestError("You have already used this coupon maximum times");
      }
    }

    let discountAmount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discountAmount = (orderAmount * Number(coupon.discountValue)) / 100;
      if (coupon.maximumDiscount) {
        discountAmount = Math.min(discountAmount, Number(coupon.maximumDiscount));
      }
    } else {
      discountAmount = Number(coupon.discountValue);
    }
    discountAmount = Math.min(discountAmount, orderAmount);
    discountAmount = Math.round(discountAmount * 100) / 100;

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
      discountAmount,
    };
  }

  /**
   * Redeem coupon against an order (records CouponRedemption)
   */
  async redeemCoupon(organizationId: string, input: RedeemCouponInput) {
    const code = input.code.toUpperCase();
    const coupon = await prisma.coupon.findUnique({
      where: {
        organizationId_code: { organizationId, code },
      },
    });
    if (!coupon) throw new NotFoundError("Invalid coupon code");
    if (coupon.status !== "ACTIVE") {
      throw new BadRequestError(`Coupon is ${coupon.status.toLowerCase()}`);
    }

    const order = await prisma.order.findFirst({
      where: { id: input.orderId, organizationId },
    });
    if (!order) throw new BadRequestError("Order not found");

    const existing = await prisma.couponRedemption.findUnique({
      where: {
        couponId_orderId: { couponId: coupon.id, orderId: input.orderId },
      },
    });
    if (existing) throw new ConflictError("Coupon already redeemed on this order");

    return prisma.$transaction(async (tx) => {
      const redemption = await tx.couponRedemption.create({
        data: {
          couponId: coupon.id,
          customerId: input.customerId,
          orderId: input.orderId,
          discountAmount: input.discountAmount,
        },
      });

      const newCount = coupon.usageCount + 1;
      const updates: any = { usageCount: newCount };
      if (coupon.usageLimit !== null && newCount >= coupon.usageLimit) {
        updates.status = "EXHAUSTED";
      }

      await tx.coupon.update({
        where: { id: coupon.id },
        data: updates,
      });

      return redemption;
    });
  }
}

export const marketingService = new MarketingService();
