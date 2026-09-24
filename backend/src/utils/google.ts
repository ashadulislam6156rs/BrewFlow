import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";
import { BadRequestError, UnauthorizedError } from "./AppError.js";

export interface GoogleUserInfo {
  googleId: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName?: string;
  picture?: string;
}

let client: OAuth2Client | null = null;

function getClient(): OAuth2Client {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new BadRequestError(
      "Google login is not configured. Please set GOOGLE_CLIENT_ID in environment."
    );
  }

  if (!client) {
    client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  }
  return client;
}

/**
 * Verify Google ID Token and extract user info
 */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleUserInfo> {
  try {
    const ticket = await getClient().verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new UnauthorizedError("Invalid Google token");
    }

    if (!payload.email) {
      throw new UnauthorizedError("Google account has no email");
    }

    // Prefer given_name / family_name, fallback to name
    const firstName =
      payload.given_name ||
      (payload.name ? payload.name.split(" ")[0] : "User");
    const lastName =
      payload.family_name ||
      (payload.name ? payload.name.split(" ").slice(1).join(" ") || undefined : undefined);

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: payload.email_verified ?? false,
      firstName,
      lastName,
      picture: payload.picture,
    };
  } catch (error: any) {
    if (error instanceof BadRequestError || error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError("Invalid or expired Google token");
  }
}
