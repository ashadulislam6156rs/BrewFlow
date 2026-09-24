import { prisma } from "../../config/database.js";
import { NotFoundError, ForbiddenError, ConflictError } from "../../utils/AppError.js";
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from "./organization.validation.js";

export class OrganizationService {
  /**
   * Get current user's organization
   */
  async getMyOrganization(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        logoAsset: {
          select: {
            id: true,
            publicId: true,
            secureUrl: true,
            url: true,
          },
        },
        _count: {
          select: {
            users: true,
            branches: true,
            products: true,
            orders: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundError("Organization not found");
    }

    return org;
  }

  /**
   * Update current organization (Owner/Admin only)
   */
  async updateMyOrganization(
    organizationId: string,
    input: UpdateOrganizationInput
  ) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new NotFoundError("Organization not found");
    }

    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...input,
        website: input.website === "" ? null : input.website,
      },
      include: {
        logoAsset: {
          select: {
            id: true,
            publicId: true,
            secureUrl: true,
            url: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Get organization by ID (with ownership check)
   */
  async getById(id: string, requesterOrgId: string) {
    if (id !== requesterOrgId) {
      throw new ForbiddenError("You can only access your own organization");
    }
    return this.getMyOrganization(id);
  }
}

export const organizationService = new OrganizationService();
