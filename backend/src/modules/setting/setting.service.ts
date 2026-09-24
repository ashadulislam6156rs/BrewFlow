import { prisma } from "../../config/database.js";
import { NotFoundError } from "../../utils/AppError.js";
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

export class SettingService {
  // ─── Setting ─────────────────────────────────────────────
  async getOrCreateSetting(organizationId: string) {
    let setting = await prisma.setting.findUnique({
      where: { organizationId },
      include: {
        logoAsset: { select: { id: true, publicId: true, secureUrl: true } },
        faviconAsset: { select: { id: true, publicId: true, secureUrl: true } },
      },
    });

    if (!setting) {
      setting = await prisma.setting.create({
        data: { organizationId },
        include: {
          logoAsset: { select: { id: true, publicId: true, secureUrl: true } },
          faviconAsset: { select: { id: true, publicId: true, secureUrl: true } },
        },
      });
    }

    return setting;
  }

  async updateSetting(organizationId: string, input: UpdateSettingInput) {
    await this.getOrCreateSetting(organizationId);

    return prisma.setting.update({
      where: { organizationId },
      data: input,
      include: {
        logoAsset: { select: { id: true, publicId: true, secureUrl: true } },
        faviconAsset: { select: { id: true, publicId: true, secureUrl: true } },
      },
    });
  }

  // ─── ContactInfo ─────────────────────────────────────────
  async getOrCreateContactInfo(organizationId: string) {
    let contact = await prisma.contactInfo.findUnique({
      where: { organizationId },
    });

    if (!contact) {
      contact = await prisma.contactInfo.create({
        data: { organizationId },
      });
    }

    return contact;
  }

  async updateContactInfo(organizationId: string, input: UpdateContactInfoInput) {
    await this.getOrCreateContactInfo(organizationId);

    return prisma.contactInfo.update({
      where: { organizationId },
      data: {
        ...input,
        mapUrl: input.mapUrl === "" ? null : input.mapUrl,
      },
    });
  }

  // ─── FAQ ─────────────────────────────────────────────────
  async listFaqs(organizationId: string, publishedOnly = false) {
    return prisma.fAQ.findMany({
      where: {
        organizationId,
        ...(publishedOnly && { isPublished: true }),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  async createFaq(organizationId: string, input: CreateFaqInput) {
    return prisma.fAQ.create({
      data: {
        organizationId,
        question: input.question,
        answer: input.answer,
        sortOrder: input.sortOrder ?? 0,
        isPublished: input.isPublished ?? true,
      },
    });
  }

  async updateFaq(organizationId: string, id: string, input: UpdateFaqInput) {
    const faq = await prisma.fAQ.findFirst({
      where: { id, organizationId },
    });
    if (!faq) throw new NotFoundError("FAQ not found");

    return prisma.fAQ.update({
      where: { id },
      data: input,
    });
  }

  async deleteFaq(organizationId: string, id: string) {
    const faq = await prisma.fAQ.findFirst({
      where: { id, organizationId },
    });
    if (!faq) throw new NotFoundError("FAQ not found");

    await prisma.fAQ.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ─── SocialLink ──────────────────────────────────────────
  async listSocialLinks(organizationId: string, activeOnly = false) {
    return prisma.socialLink.findMany({
      where: {
        organizationId,
        ...(activeOnly && { isActive: true }),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  async createSocialLink(organizationId: string, input: CreateSocialLinkInput) {
    return prisma.socialLink.create({
      data: {
        organizationId,
        platform: input.platform,
        label: input.label,
        url: input.url,
        icon: input.icon,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
      },
    });
  }

  async updateSocialLink(
    organizationId: string,
    id: string,
    input: UpdateSocialLinkInput
  ) {
    const link = await prisma.socialLink.findFirst({
      where: { id, organizationId },
    });
    if (!link) throw new NotFoundError("Social link not found");

    return prisma.socialLink.update({
      where: { id },
      data: input,
    });
  }

  async deleteSocialLink(organizationId: string, id: string) {
    const link = await prisma.socialLink.findFirst({
      where: { id, organizationId },
    });
    if (!link) throw new NotFoundError("Social link not found");

    await prisma.socialLink.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ─── SiteBanner ──────────────────────────────────────────
  async listBanners(organizationId: string, activeOnly = false) {
    return prisma.siteBanner.findMany({
      where: {
        organizationId,
        ...(activeOnly && { isActive: true }),
      },
      include: {
        imageAsset: { select: { id: true, publicId: true, secureUrl: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
  }

  async createBanner(organizationId: string, input: CreateSiteBannerInput) {
    return prisma.siteBanner.create({
      data: {
        organizationId,
        title: input.title,
        subtitle: input.subtitle,
        buttonText: input.buttonText,
        buttonUrl: input.buttonUrl === "" ? null : input.buttonUrl,
        imageAssetId: input.imageAssetId,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      },
      include: {
        imageAsset: { select: { id: true, publicId: true, secureUrl: true } },
      },
    });
  }

  async updateBanner(
    organizationId: string,
    id: string,
    input: UpdateSiteBannerInput
  ) {
    const banner = await prisma.siteBanner.findFirst({
      where: { id, organizationId },
    });
    if (!banner) throw new NotFoundError("Banner not found");

    return prisma.siteBanner.update({
      where: { id },
      data: {
        ...input,
        buttonUrl: input.buttonUrl === "" ? null : input.buttonUrl,
      },
      include: {
        imageAsset: { select: { id: true, publicId: true, secureUrl: true } },
      },
    });
  }

  async deleteBanner(organizationId: string, id: string) {
    const banner = await prisma.siteBanner.findFirst({
      where: { id, organizationId },
    });
    if (!banner) throw new NotFoundError("Banner not found");

    await prisma.siteBanner.delete({ where: { id } });
    return { id, deleted: true };
  }
}

export const settingService = new SettingService();
