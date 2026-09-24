import type { Request, Response } from "express";
import { marketingService } from "./marketing.service.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
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

// Tax
export const createTaxRate = asyncHandler(async (req: Request, res: Response) => {
  const result = await marketingService.createTaxRate(
    req.user!.organizationId,
    req.body as CreateTaxRateInput
  );
  return sendSuccess(res, result, "Tax rate created", 201);
});

export const listTaxRates = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListQuery;
  const { items, total, page, limit } = await marketingService.listTaxRates(
    req.user!.organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Tax rates fetched");
});

export const updateTaxRate = asyncHandler(async (req: Request, res: Response) => {
  const result = await marketingService.updateTaxRate(
    req.user!.organizationId,
    req.params.id,
    req.body as UpdateTaxRateInput
  );
  return sendSuccess(res, result, "Tax rate updated");
});

export const deleteTaxRate = asyncHandler(async (req: Request, res: Response) => {
  const result = await marketingService.deleteTaxRate(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Tax rate deactivated");
});

// Discount
export const createDiscount = asyncHandler(async (req: Request, res: Response) => {
  const result = await marketingService.createDiscount(
    req.user!.organizationId,
    req.body as CreateDiscountInput
  );
  return sendSuccess(res, result, "Discount created", 201);
});

export const listDiscounts = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListQuery;
  const { items, total, page, limit } = await marketingService.listDiscounts(
    req.user!.organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Discounts fetched");
});

export const updateDiscount = asyncHandler(async (req: Request, res: Response) => {
  const result = await marketingService.updateDiscount(
    req.user!.organizationId,
    req.params.id,
    req.body as UpdateDiscountInput
  );
  return sendSuccess(res, result, "Discount updated");
});

export const deleteDiscount = asyncHandler(async (req: Request, res: Response) => {
  const result = await marketingService.deleteDiscount(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Discount deactivated");
});

// Promotion
export const createPromotion = asyncHandler(async (req: Request, res: Response) => {
  const result = await marketingService.createPromotion(
    req.user!.organizationId,
    req.body as CreatePromotionInput
  );
  return sendSuccess(res, result, "Promotion created", 201);
});

export const listPromotions = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListQuery;
  const { items, total, page, limit } = await marketingService.listPromotions(
    req.user!.organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Promotions fetched");
});

export const updatePromotion = asyncHandler(async (req: Request, res: Response) => {
  const result = await marketingService.updatePromotion(
    req.user!.organizationId,
    req.params.id,
    req.body as UpdatePromotionInput
  );
  return sendSuccess(res, result, "Promotion updated");
});

export const deletePromotion = asyncHandler(async (req: Request, res: Response) => {
  const result = await marketingService.deletePromotion(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Promotion deactivated");
});

// Coupon
export const createCoupon = asyncHandler(async (req: Request, res: Response) => {
  const result = await marketingService.createCoupon(
    req.user!.organizationId,
    req.body as CreateCouponInput
  );
  return sendSuccess(res, result, "Coupon created", 201);
});

export const listCoupons = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListQuery;
  const { items, total, page, limit } = await marketingService.listCoupons(
    req.user!.organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Coupons fetched");
});

export const getCoupon = asyncHandler(async (req: Request, res: Response) => {
  const result = await marketingService.getCoupon(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Coupon fetched");
});

export const updateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const result = await marketingService.updateCoupon(
    req.user!.organizationId,
    req.params.id,
    req.body as UpdateCouponInput
  );
  return sendSuccess(res, result, "Coupon updated");
});

export const deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
  const result = await marketingService.deleteCoupon(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Coupon deactivated");
});

export const validateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const result = await marketingService.validateCoupon(
    req.user!.organizationId,
    req.body as ValidateCouponInput
  );
  return sendSuccess(res, result, "Coupon validated");
});

export const redeemCoupon = asyncHandler(async (req: Request, res: Response) => {
  const result = await marketingService.redeemCoupon(
    req.user!.organizationId,
    req.body as RedeemCouponInput
  );
  return sendSuccess(res, result, "Coupon redeemed", 201);
});
