import { z } from "zod";

export const updateSettingSchema = z.object({
  siteName: z.string().max(100).optional().nullable(),
  tagline: z.string().max(255).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  logoAssetId: z.string().cuid().optional().nullable(),
  faviconAssetId: z.string().cuid().optional().nullable(),
  primaryColor: z.string().max(20).optional().nullable(),
  secondaryColor: z.string().max(20).optional().nullable(),
  accentColor: z.string().max(20).optional().nullable(),
  defaultCurrency: z.string().length(3).optional(),
  timezone: z.string().max(50).optional(),
  locale: z.string().max(20).optional(),
  orderSettings: z.record(z.unknown()).optional().nullable(),
  deliverySettings: z.record(z.unknown()).optional().nullable(),
  paymentSettings: z.record(z.unknown()).optional().nullable(),
  invoiceSettings: z.record(z.unknown()).optional().nullable(),
  seoSettings: z.record(z.unknown()).optional().nullable(),
  socialSettings: z.record(z.unknown()).optional().nullable(),
});

export const updateContactInfoSchema = z.object({
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  alternatePhone: z.string().max(20).optional().nullable(),
  whatsapp: z.string().max(20).optional().nullable(),
  address: z.string().max(1000).optional().nullable(),
  mapUrl: z.string().url().optional().nullable().or(z.literal("")),
  openingHours: z.record(z.unknown()).optional().nullable(),
});

export const createFaqSchema = z.object({
  question: z.string().min(1).max(1000),
  answer: z.string().min(1).max(5000),
  sortOrder: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
});

export const updateFaqSchema = createFaqSchema.partial();

export const createSocialLinkSchema = z.object({
  platform: z.enum([
    "FACEBOOK",
    "INSTAGRAM",
    "YOUTUBE",
    "TIKTOK",
    "LINKEDIN",
    "X",
    "WHATSAPP",
    "WEBSITE",
    "OTHER",
  ]),
  label: z.string().max(100).optional(),
  url: z.string().url(),
  icon: z.string().max(100).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateSocialLinkSchema = createSocialLinkSchema.partial();

export const createSiteBannerSchema = z.object({
  title: z.string().max(200).optional(),
  subtitle: z.string().max(1000).optional(),
  buttonText: z.string().max(50).optional(),
  buttonUrl: z.string().url().optional().or(z.literal("")),
  imageAssetId: z.string().cuid().optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
});

export const updateSiteBannerSchema = createSiteBannerSchema.partial();

export const idParamSchema = z.object({
  id: z.string().cuid(),
});

export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;
export type UpdateContactInfoInput = z.infer<typeof updateContactInfoSchema>;
export type CreateFaqInput = z.infer<typeof createFaqSchema>;
export type UpdateFaqInput = z.infer<typeof updateFaqSchema>;
export type CreateSocialLinkInput = z.infer<typeof createSocialLinkSchema>;
export type UpdateSocialLinkInput = z.infer<typeof updateSocialLinkSchema>;
export type CreateSiteBannerInput = z.infer<typeof createSiteBannerSchema>;
export type UpdateSiteBannerInput = z.infer<typeof updateSiteBannerSchema>;
