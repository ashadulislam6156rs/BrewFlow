import type { Request, Response } from "express";
import { settingService } from "./setting.service.js";
import { sendSuccess } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  UpdateSettingInput,
  UpdateContactInfoInput,
  CreateFaqInput,
  UpdateFaqInput,
  CreateSocialLinkInput,
  UpdateSocialLinkInput,
  CreateSiteBannerInput,
  UpdateSiteBannerInput,
} from "./setting.validation.js";

// Setting
export const getSetting = asyncHandler(async (req: Request, res: Response) => {
  const result = await settingService.getOrCreateSetting(req.user!.organizationId);
  return sendSuccess(res, result, "Setting fetched successfully");
});

export const updateSetting = asyncHandler(async (req: Request, res: Response) => {
  const result = await settingService.updateSetting(
    req.user!.organizationId,
    req.body as UpdateSettingInput
  );
  return sendSuccess(res, result, "Setting updated successfully");
});

// ContactInfo
export const getContactInfo = asyncHandler(async (req: Request, res: Response) => {
  const result = await settingService.getOrCreateContactInfo(req.user!.organizationId);
  return sendSuccess(res, result, "Contact info fetched successfully");
});

export const updateContactInfo = asyncHandler(async (req: Request, res: Response) => {
  const result = await settingService.updateContactInfo(
    req.user!.organizationId,
    req.body as UpdateContactInfoInput
  );
  return sendSuccess(res, result, "Contact info updated successfully");
});

// FAQ
export const listFaqs = asyncHandler(async (req: Request, res: Response) => {
  const publishedOnly = req.query.published === "true";
  const result = await settingService.listFaqs(req.user!.organizationId, publishedOnly);
  return sendSuccess(res, result, "FAQs fetched successfully");
});

export const createFaq = asyncHandler(async (req: Request, res: Response) => {
  const result = await settingService.createFaq(
    req.user!.organizationId,
    req.body as CreateFaqInput
  );
  return sendSuccess(res, result, "FAQ created successfully", 201);
});

export const updateFaq = asyncHandler(async (req: Request, res: Response) => {
  const result = await settingService.updateFaq(
    req.user!.organizationId,
    req.params.id,
    req.body as UpdateFaqInput
  );
  return sendSuccess(res, result, "FAQ updated successfully");
});

export const deleteFaq = asyncHandler(async (req: Request, res: Response) => {
  const result = await settingService.deleteFaq(req.user!.organizationId, req.params.id);
  return sendSuccess(res, result, "FAQ deleted successfully");
});

// SocialLink
export const listSocialLinks = asyncHandler(async (req: Request, res: Response) => {
  const activeOnly = req.query.active === "true";
  const result = await settingService.listSocialLinks(
    req.user!.organizationId,
    activeOnly
  );
  return sendSuccess(res, result, "Social links fetched successfully");
});

export const createSocialLink = asyncHandler(async (req: Request, res: Response) => {
  const result = await settingService.createSocialLink(
    req.user!.organizationId,
    req.body as CreateSocialLinkInput
  );
  return sendSuccess(res, result, "Social link created successfully", 201);
});

export const updateSocialLink = asyncHandler(async (req: Request, res: Response) => {
  const result = await settingService.updateSocialLink(
    req.user!.organizationId,
    req.params.id,
    req.body as UpdateSocialLinkInput
  );
  return sendSuccess(res, result, "Social link updated successfully");
});

export const deleteSocialLink = asyncHandler(async (req: Request, res: Response) => {
  const result = await settingService.deleteSocialLink(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Social link deleted successfully");
});

// SiteBanner
export const listBanners = asyncHandler(async (req: Request, res: Response) => {
  const activeOnly = req.query.active === "true";
  const result = await settingService.listBanners(
    req.user!.organizationId,
    activeOnly
  );
  return sendSuccess(res, result, "Banners fetched successfully");
});

export const createBanner = asyncHandler(async (req: Request, res: Response) => {
  const result = await settingService.createBanner(
    req.user!.organizationId,
    req.body as CreateSiteBannerInput
  );
  return sendSuccess(res, result, "Banner created successfully", 201);
});

export const updateBanner = asyncHandler(async (req: Request, res: Response) => {
  const result = await settingService.updateBanner(
    req.user!.organizationId,
    req.params.id,
    req.body as UpdateSiteBannerInput
  );
  return sendSuccess(res, result, "Banner updated successfully");
});

export const deleteBanner = asyncHandler(async (req: Request, res: Response) => {
  const result = await settingService.deleteBanner(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Banner deleted successfully");
});
