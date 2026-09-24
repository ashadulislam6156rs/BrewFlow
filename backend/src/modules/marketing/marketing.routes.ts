import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createTaxRate,
  listTaxRates,
  updateTaxRate,
  deleteTaxRate,
  createDiscount,
  listDiscounts,
  updateDiscount,
  deleteDiscount,
  createPromotion,
  listPromotions,
  updatePromotion,
  deletePromotion,
  createCoupon,
  listCoupons,
  getCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
  redeemCoupon,
} from "./marketing.controller.js";
import {
  createTaxRateSchema,
  updateTaxRateSchema,
  createDiscountSchema,
  updateDiscountSchema,
  createPromotionSchema,
  updatePromotionSchema,
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
  redeemCouponSchema,
  listQuerySchema,
  idParamSchema,
} from "./marketing.validation.js";

const router = Router();
router.use(authenticate);

// Tax rates
router.get("/tax-rates", validate(listQuerySchema, "query"), listTaxRates);
router.post(
  "/tax-rates",
  authorize("Owner", "Admin"),
  validate(createTaxRateSchema),
  createTaxRate
);
router.patch(
  "/tax-rates/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  validate(updateTaxRateSchema),
  updateTaxRate
);
router.delete(
  "/tax-rates/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  deleteTaxRate
);

// Discounts
router.get("/discounts", validate(listQuerySchema, "query"), listDiscounts);
router.post(
  "/discounts",
  authorize("Owner", "Admin"),
  validate(createDiscountSchema),
  createDiscount
);
router.patch(
  "/discounts/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  validate(updateDiscountSchema),
  updateDiscount
);
router.delete(
  "/discounts/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  deleteDiscount
);

// Promotions
router.get("/promotions", validate(listQuerySchema, "query"), listPromotions);
router.post(
  "/promotions",
  authorize("Owner", "Admin"),
  validate(createPromotionSchema),
  createPromotion
);
router.patch(
  "/promotions/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  validate(updatePromotionSchema),
  updatePromotion
);
router.delete(
  "/promotions/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  deletePromotion
);

// Coupons
router.get("/coupons", validate(listQuerySchema, "query"), listCoupons);
router.post(
  "/coupons",
  authorize("Owner", "Admin"),
  validate(createCouponSchema),
  createCoupon
);
router.post("/coupons/validate", validate(validateCouponSchema), validateCoupon);
router.post(
  "/coupons/redeem",
  authorize("Owner", "Admin"),
  validate(redeemCouponSchema),
  redeemCoupon
);
router.get("/coupons/:id", validate(idParamSchema, "params"), getCoupon);
router.patch(
  "/coupons/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  validate(updateCouponSchema),
  updateCoupon
);
router.delete(
  "/coupons/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  deleteCoupon
);

export default router;
