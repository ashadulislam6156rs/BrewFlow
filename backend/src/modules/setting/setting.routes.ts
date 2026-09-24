import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  getSetting,
  updateSetting,
  getContactInfo,
  updateContactInfo,
  listFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  listSocialLinks,
  createSocialLink,
  updateSocialLink,
  deleteSocialLink,
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from "./setting.controller.js";
import {
  updateSettingSchema,
  updateContactInfoSchema,
  createFaqSchema,
  updateFaqSchema,
  createSocialLinkSchema,
  updateSocialLinkSchema,
  createSiteBannerSchema,
  updateSiteBannerSchema,
  idParamSchema,
} from "./setting.validation.js";

const router = Router();
router.use(authenticate);

// Setting
router.get("/", getSetting);
router.patch("/", authorize("Owner", "Admin"), validate(updateSettingSchema), updateSetting);

// ContactInfo
router.get("/contact", getContactInfo);
router.patch(
  "/contact",
  authorize("Owner", "Admin"),
  validate(updateContactInfoSchema),
  updateContactInfo
);

// FAQ
router.get("/faqs", listFaqs);
router.post(
  "/faqs",
  authorize("Owner", "Admin"),
  validate(createFaqSchema),
  createFaq
);
router.patch(
  "/faqs/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  validate(updateFaqSchema),
  updateFaq
);
router.delete(
  "/faqs/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  deleteFaq
);

// Social Links
router.get("/social-links", listSocialLinks);
router.post(
  "/social-links",
  authorize("Owner", "Admin"),
  validate(createSocialLinkSchema),
  createSocialLink
);
router.patch(
  "/social-links/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  validate(updateSocialLinkSchema),
  updateSocialLink
);
router.delete(
  "/social-links/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  deleteSocialLink
);

// Banners
router.get("/banners", listBanners);
router.post(
  "/banners",
  authorize("Owner", "Admin"),
  validate(createSiteBannerSchema),
  createBanner
);
router.patch(
  "/banners/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  validate(updateSiteBannerSchema),
  updateBanner
);
router.delete(
  "/banners/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  deleteBanner
);

export default router;
