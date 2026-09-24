import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from "../../utils/AppError.js";
import type {
  CreateReviewInput,
  UpdateReviewStatusInput,
  ListReviewsQuery,
} from "./review.validation.js";
import { Prisma } from "@prisma/client";

export class ReviewService {
  async create(organizationId: string, input: CreateReviewInput) {
    const product = await prisma.product.findFirst({
      where: { id: input.productId, organizationId },
    });
    if (!product) throw new BadRequestError("Product not found");

    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, organizationId },
    });
    if (!customer) throw new BadRequestError("Customer not found");

    if (input.orderId) {
      const order = await prisma.order.findFirst({
        where: {
          id: input.orderId,
          organizationId,
          customerId: input.customerId,
        },
      });
      if (!order) throw new BadRequestError("Order not found for this customer");
    }

    // One review per customer per product (optional uniqueness)
    const existing = await prisma.productReview.findFirst({
      where: {
        productId: input.productId,
        customerId: input.customerId,
      },
    });
    if (existing) {
      throw new ConflictError("Customer already reviewed this product");
    }

    return prisma.productReview.create({
      data: {
        productId: input.productId,
        customerId: input.customerId,
        orderId: input.orderId,
        rating: input.rating,
        title: input.title,
        comment: input.comment,
        status: "PENDING",
      },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        customer: { select: { id: true, name: true } },
      },
    });
  }

  async list(organizationId: string, query: ListReviewsQuery) {
    const { page, limit, productId, customerId, status, minRating } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductReviewWhereInput = {
      product: { organizationId },
      ...(productId && { productId }),
      ...(customerId && { customerId }),
      ...(status && { status }),
      ...(minRating && { rating: { gte: minRating } }),
    };

    const [items, total] = await Promise.all([
      prisma.productReview.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { id: true, name: true, slug: true } },
          customer: { select: { id: true, name: true } },
        },
      }),
      prisma.productReview.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getById(organizationId: string, id: string) {
    const review = await prisma.productReview.findFirst({
      where: { id, product: { organizationId } },
      include: {
        product: { select: { id: true, name: true, slug: true } },
        customer: {
          select: { id: true, name: true, phone: true },
        },
        order: {
          select: { id: true, orderNo: true },
        },
      },
    });
    if (!review) throw new NotFoundError("Review not found");
    return review;
  }

  async updateStatus(
    organizationId: string,
    id: string,
    input: UpdateReviewStatusInput
  ) {
    const review = await prisma.productReview.findFirst({
      where: { id, product: { organizationId } },
    });
    if (!review) throw new NotFoundError("Review not found");

    return prisma.productReview.update({
      where: { id },
      data: { status: input.status },
      include: {
        product: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
      },
    });
  }

  async delete(organizationId: string, id: string) {
    const review = await prisma.productReview.findFirst({
      where: { id, product: { organizationId } },
    });
    if (!review) throw new NotFoundError("Review not found");

    await prisma.productReview.delete({ where: { id } });
    return { id, deleted: true };
  }

  async productSummary(organizationId: string, productId: string) {
    const product = await prisma.product.findFirst({
      where: { id: productId, organizationId },
    });
    if (!product) throw new NotFoundError("Product not found");

    const approved = await prisma.productReview.findMany({
      where: { productId, status: "APPROVED" },
      select: { rating: true },
    });

    const count = approved.length;
    const avg =
      count > 0
        ? Math.round(
            (approved.reduce((s, r) => s + r.rating, 0) / count) * 10
          ) / 10
        : 0;

    const distribution = [1, 2, 3, 4, 5].map((star) => ({
      rating: star,
      count: approved.filter((r) => r.rating === star).length,
    }));

    return {
      productId,
      averageRating: avg,
      totalReviews: count,
      distribution,
    };
  }
}

export const reviewService = new ReviewService();
