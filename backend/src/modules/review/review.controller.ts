import type { Request, Response } from "express";
import { reviewService } from "./review.service.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  CreateReviewInput,
  UpdateReviewStatusInput,
  ListReviewsQuery,
} from "./review.validation.js";

export const createReview = asyncHandler(async (req: Request, res: Response) => {
  const result = await reviewService.create(
    req.user!.organizationId,
    req.body as CreateReviewInput
  );
  return sendSuccess(res, result, "Review submitted", 201);
});

export const listReviews = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListReviewsQuery;
  const { items, total, page, limit } = await reviewService.list(
    req.user!.organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Reviews fetched");
});

export const getReview = asyncHandler(async (req: Request, res: Response) => {
  const result = await reviewService.getById(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Review fetched");
});

export const updateReviewStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await reviewService.updateStatus(
      req.user!.organizationId,
      req.params.id,
      req.body as UpdateReviewStatusInput
    );
    return sendSuccess(res, result, "Review status updated");
  }
);

export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  const result = await reviewService.delete(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Review deleted");
});

export const productReviewSummary = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await reviewService.productSummary(
      req.user!.organizationId,
      req.params.productId
    );
    return sendSuccess(res, result, "Product review summary");
  }
);
