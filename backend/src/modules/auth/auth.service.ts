import { prisma } from "../../config/database.js";
import { hashPassword, comparePassword } from "../../utils/password.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt.js";
import { verifyGoogleIdToken } from "../../utils/google.js";
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from "../../utils/AppError.js";
import type {
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
  GoogleAuthInput,
} from "./auth.validation.js";
import type { JwtPayload } from "../../middlewares/auth.middleware.js";
import crypto from "crypto";

export class AuthService {
  /**
   * Register new organization + owner user
   */
  async register(input: RegisterInput) {
    // Check slug uniqueness
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: input.organizationSlug },
    });
    if (existingOrg) {
      throw new ConflictError("Organization slug already taken");
    }

    // Check email uniqueness (we will create org first)
    // Since email is unique per organization, we check after org creation,
    // but for safety we can still proceed inside transaction.

    const passwordHash = await hashPassword(input.password);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Organization
      const organization = await tx.organization.create({
        data: {
          name: input.organizationName,
          slug: input.organizationSlug,
          status: "ACTIVE",
        },
      });

      // 2. Create default "Owner" / "Admin" role for this organization
      const ownerRole = await tx.role.create({
        data: {
          organizationId: organization.id,
          name: "Owner",
          description: "Organization owner with full access",
          scope: "ORGANIZATION",
          isSystemRole: true,
        },
      });

      // 3. Create User
      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          passwordHash,
          status: "ACTIVE",
          emailVerifiedAt: new Date(), // auto-verify for now
        },
      });

      // 4. Assign Owner role
      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: ownerRole.id,
        },
      });

      return { organization, user, role: ownerRole };
    });

    // Generate tokens
    const payload: JwtPayload = {
      userId: result.user.id,
      organizationId: result.organization.id,
      email: result.user.email,
      roles: [result.role.name],
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: result.user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: this.sanitizeUser(result.user),
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  /**
   * Login with email + password
   * organizationSlug is optional but recommended when same email exists in multiple orgs
   */
  async login(input: LoginInput) {
    let user;

    if (input.organizationSlug) {
      const org = await prisma.organization.findUnique({
        where: { slug: input.organizationSlug },
      });
      if (!org) {
        throw new UnauthorizedError("Invalid credentials");
      }

      user = await prisma.user.findUnique({
        where: {
          organizationId_email: {
            organizationId: org.id,
            email: input.email,
          },
        },
        include: {
          roles: {
            include: { role: true },
          },
          organization: {
            select: { id: true, name: true, slug: true, status: true },
          },
        },
      });
    } else {
      // Find by email only (first match)
      user = await prisma.user.findFirst({
        where: { email: input.email },
        include: {
          roles: {
            include: { role: true },
          },
          organization: {
            select: { id: true, name: true, slug: true, status: true },
          },
        },
      });
    }

    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedError("Account is not active");
    }

    if (user.organization.status !== "ACTIVE") {
      throw new UnauthorizedError("Organization is not active");
    }

    const isMatch = await comparePassword(input.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const roles = user.roles.map((ur) => ur.role.name);

    const payload: JwtPayload = {
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email,
      roles,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: this.sanitizeUser(user),
      organization: user.organization,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refresh(refreshToken: string) {
    let payload: JwtPayload;

    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        roles: { include: { role: true } },
        organization: {
          select: { id: true, name: true, slug: true, status: true },
        },
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedError("User not found or inactive");
    }

    if (user.organization.status !== "ACTIVE") {
      throw new UnauthorizedError("Organization is not active");
    }

    const roles = user.roles.map((ur) => ur.role.name);

    const newPayload: JwtPayload = {
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email,
      roles,
    };

    const accessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    return {
      tokens: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    };
  }

  /**
   * Get current authenticated user profile
   */
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            currency: true,
            timezone: true,
          },
        },
        branches: {
          include: {
            branch: {
              select: { id: true, name: true, code: true, status: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const roles = user.roles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      scope: ur.role.scope,
      permissions: ur.role.permissions.map((rp) => rp.permission.code),
    }));

    return {
      ...this.sanitizeUser(user),
      organization: user.organization,
      roles,
      branches: user.branches.map((ub) => ub.branch),
    };
  }

  /**
   * Google Login / Register
   * - Verifies Google ID Token
   * - If user exists → login
   * - If user doesn't exist → create organization + user (register)
   */
  async googleAuth(input: GoogleAuthInput) {
    // 1. Verify Google token
    const googleUser = await verifyGoogleIdToken(input.idToken);

    if (!googleUser.emailVerified) {
      throw new BadRequestError("Google email is not verified");
    }

    // 2. Try to find existing user by email
    const existingUser = await prisma.user.findFirst({
      where: { email: googleUser.email },
      include: {
        roles: { include: { role: true } },
        organization: {
          select: { id: true, name: true, slug: true, status: true },
        },
      },
    });

    // ========== EXISTING USER → LOGIN ==========
    if (existingUser) {
      if (existingUser.status !== "ACTIVE") {
        throw new UnauthorizedError("Account is not active");
      }
      if (existingUser.organization.status !== "ACTIVE") {
        throw new UnauthorizedError("Organization is not active");
      }

      const roles = existingUser.roles.map((ur) => ur.role.name);

      const payload: JwtPayload = {
        userId: existingUser.id,
        organizationId: existingUser.organizationId,
        email: existingUser.email,
        roles,
      };

      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload);

      await prisma.user.update({
        where: { id: existingUser.id },
        data: { lastLoginAt: new Date() },
      });

      return {
        isNewUser: false,
        user: this.sanitizeUser(existingUser),
        organization: existingUser.organization,
        tokens: { accessToken, refreshToken },
      };
    }

    // ========== NEW USER → REGISTER ==========
    // Generate organization name & slug
    let orgName = input.organizationName;
    let orgSlug = input.organizationSlug;

    if (!orgName) {
      orgName = `${googleUser.firstName}'s Restaurant`;
    }

    if (!orgSlug) {
      // Generate slug from email or name
      const base =
        googleUser.email.split("@")[0].replace(/[^a-z0-9]/gi, "-").toLowerCase() ||
        googleUser.firstName.toLowerCase().replace(/[^a-z0-9]/g, "-");
      orgSlug = `${base}-${crypto.randomBytes(3).toString("hex")}`;
    }

    // Ensure slug is unique
    const slugExists = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });
    if (slugExists) {
      orgSlug = `${orgSlug}-${crypto.randomBytes(2).toString("hex")}`;
    }

    // Random password (user will never use it for Google account)
    const randomPassword = crypto.randomBytes(32).toString("hex");
    const passwordHash = await hashPassword(randomPassword);

    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: orgName!,
          slug: orgSlug!,
          status: "ACTIVE",
        },
      });

      const ownerRole = await tx.role.create({
        data: {
          organizationId: organization.id,
          name: "Owner",
          description: "Organization owner with full access",
          scope: "ORGANIZATION",
          isSystemRole: true,
        },
      });

      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          firstName: googleUser.firstName,
          lastName: googleUser.lastName,
          email: googleUser.email,
          passwordHash,
          status: "ACTIVE",
          emailVerifiedAt: new Date(), // Google already verified
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: ownerRole.id,
        },
      });

      return { organization, user, role: ownerRole };
    });

    const payload: JwtPayload = {
      userId: result.user.id,
      organizationId: result.organization.id,
      email: result.user.email,
      roles: [result.role.name],
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.user.update({
      where: { id: result.user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      isNewUser: true,
      user: this.sanitizeUser(result.user),
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
      },
      tokens: { accessToken, refreshToken },
    };
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const isMatch = await comparePassword(input.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestError("Current password is incorrect");
    }

    const newHash = await hashPassword(input.newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { message: "Password changed successfully" };
  }

  /**
   * Remove sensitive fields
   */
  private sanitizeUser(user: any) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}

export const authService = new AuthService();
