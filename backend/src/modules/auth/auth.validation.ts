import { z } from "zod";

export const registerSchema = z.object({
  // Organization
  organizationName: z.string().min(2).max(100),
  organizationSlug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers and hyphens"),

  // User
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50).optional(),
  email: z.string().email().toLowerCase(),
  phone: z.string().min(10).max(20).optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
  organizationSlug: z.string().min(1).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .max(100)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

/**
 * Google Login / Register
 * - idToken: required (from Google Sign-In on frontend)
 * - organizationName + organizationSlug: optional
 *   → If user already exists → just login
 *   → If user doesn't exist + org info given → create that org + user
 *   → If user doesn't exist + no org info → auto-create org from name/email
 */
export const googleAuthSchema = z.object({
  idToken: z.string().min(1, "Google ID token is required"),
  organizationName: z.string().min(2).max(100).optional(),
  organizationSlug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers and hyphens")
    .optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;
