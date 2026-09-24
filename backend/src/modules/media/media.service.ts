import { prisma } from "../../config/database.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../../utils/AppError.js";
import type {
  RegisterAssetInput,
  UpdateAssetInput,
  ListAssetsQuery,
} from "./media.validation.js";
import { Prisma } from "@prisma/client";

/**
 * Media / CloudinaryAsset service
 * Frontend uploads to Cloudinary, then registers the result here.
 * Soft-delete marks PENDING_DELETE for a background worker to purge from CDN.
 */
export class MediaService {
  async register(input: RegisterAssetInput) {
    const existing = await prisma.cloudinaryAsset.findUnique({
      where: { publicId: input.publicId },
    });
    if (existing) {
      // Idempotent: return existing if same publicId
      if (existing.status === "ACTIVE") return existing;
      // Re-activate if was soft-deleted
      return prisma.cloudinaryAsset.update({
        where: { id: existing.id },
        data: {
          secureUrl: input.secureUrl,
          url: input.url,
          status: "ACTIVE",
          deletedAt: null,
          deleteAttempts: 0,
          lastDeleteError: null,
        },
      });
    }

    return prisma.cloudinaryAsset.create({
      data: {
        publicId: input.publicId,
        secureUrl: input.secureUrl,
        url: input.url,
        resourceType: input.resourceType ?? "IMAGE",
        deliveryType: input.deliveryType ?? "UPLOAD",
        format: input.format,
        folder: input.folder,
        version: input.version,
        originalFilename: input.originalFilename,
        bytes: input.bytes !== undefined && input.bytes !== null
          ? BigInt(input.bytes)
          : null,
        width: input.width,
        height: input.height,
        duration: input.duration,
        etag: input.etag,
        tags: input.tags ?? undefined,
        context: input.context ?? undefined,
        metadata: input.metadata ?? undefined,
        status: "ACTIVE",
      },
    });
  }

  async list(query: ListAssetsQuery) {
    const { page, limit, resourceType, status, folder, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CloudinaryAssetWhereInput = {
      ...(resourceType && { resourceType }),
      ...(status && { status }),
      ...(folder && { folder }),
      ...(search && {
        OR: [
          { publicId: { contains: search } },
          { originalFilename: { contains: search } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.cloudinaryAsset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.cloudinaryAsset.count({ where }),
    ]);

    // Serialize BigInt for JSON
    const serialized = items.map((a) => ({
      ...a,
      bytes: a.bytes !== null ? Number(a.bytes) : null,
    }));

    return { items: serialized, total, page, limit };
  }

  async getById(id: string) {
    const asset = await prisma.cloudinaryAsset.findUnique({
      where: { id },
    });
    if (!asset) throw new NotFoundError("Media asset not found");

    return {
      ...asset,
      bytes: asset.bytes !== null ? Number(asset.bytes) : null,
    };
  }

  async getByPublicId(publicId: string) {
    const asset = await prisma.cloudinaryAsset.findUnique({
      where: { publicId },
    });
    if (!asset) throw new NotFoundError("Media asset not found");

    return {
      ...asset,
      bytes: asset.bytes !== null ? Number(asset.bytes) : null,
    };
  }

  async update(id: string, input: UpdateAssetInput) {
    const asset = await prisma.cloudinaryAsset.findUnique({
      where: { id },
    });
    if (!asset) throw new NotFoundError("Media asset not found");

    const updated = await prisma.cloudinaryAsset.update({
      where: { id },
      data: {
        ...(input.tags !== undefined && { tags: input.tags ?? undefined }),
        ...(input.context !== undefined && {
          context: input.context ?? undefined,
        }),
        ...(input.metadata !== undefined && {
          metadata: input.metadata ?? undefined,
        }),
        ...(input.status && { status: input.status }),
      },
    });

    return {
      ...updated,
      bytes: updated.bytes !== null ? Number(updated.bytes) : null,
    };
  }

  /**
   * Soft-delete: mark PENDING_DELETE.
   * A background job can purge from Cloudinary and set DELETED.
   */
  async softDelete(id: string) {
    const asset = await prisma.cloudinaryAsset.findUnique({
      where: { id },
    });
    if (!asset) throw new NotFoundError("Media asset not found");
    if (asset.status === "DELETED") {
      throw new BadRequestError("Asset already deleted");
    }

    const updated = await prisma.cloudinaryAsset.update({
      where: { id },
      data: {
        status: "PENDING_DELETE",
        deletedAt: new Date(),
      },
    });

    return {
      ...updated,
      bytes: updated.bytes !== null ? Number(updated.bytes) : null,
    };
  }

  /**
   * Confirm CDN purge complete (called by worker after Cloudinary destroy)
   */
  async confirmDeleted(id: string, error?: string) {
    const asset = await prisma.cloudinaryAsset.findUnique({
      where: { id },
    });
    if (!asset) throw new NotFoundError("Media asset not found");

    if (error) {
      return prisma.cloudinaryAsset.update({
        where: { id },
        data: {
          status: "FAILED",
          deleteAttempts: { increment: 1 },
          lastDeleteError: error,
        },
      });
    }

    return prisma.cloudinaryAsset.update({
      where: { id },
      data: {
        status: "DELETED",
        deletedAt: new Date(),
      },
    });
  }

  /**
   * List assets pending CDN deletion (for worker)
   */
  async listPendingDelete(limit = 50) {
    const items = await prisma.cloudinaryAsset.findMany({
      where: { status: "PENDING_DELETE" },
      take: limit,
      orderBy: { deletedAt: "asc" },
    });

    return items.map((a) => ({
      ...a,
      bytes: a.bytes !== null ? Number(a.bytes) : null,
    }));
  }
}

export const mediaService = new MediaService();
