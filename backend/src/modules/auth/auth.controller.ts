import type { Request, Response } from "express";
import { authService } from "./auth.service.js";
import { sendSuccess } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  RegisterInput,
  LoginInput,
  RefreshInput,
  ChangePasswordInput,
  GoogleAuthInput,
} from "./auth.validation.js";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as RegisterInput;
  const result = await authService.register(input);

  return sendSuccess(res, result, "Registration successful", 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as LoginInput;
  const result = await authService.login(input);

  return sendSuccess(res, result, "Login successful");
});

export const googleAuth = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as GoogleAuthInput;
  const result = await authService.googleAuth(input);

  const message = result.isNewUser
    ? "Google registration successful"
    : "Google login successful";
  const statusCode = result.isNewUser ? 201 : 200;

  return sendSuccess(res, result, message, statusCode);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body as RefreshInput;
  const result = await authService.refresh(refreshToken);

  return sendSuccess(res, result, "Token refreshed successfully");
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await authService.getMe(userId);

  return sendSuccess(res, result, "Profile fetched successfully");
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const input = req.body as ChangePasswordInput;
  const result = await authService.changePassword(userId, input);

  return sendSuccess(res, result, result.message);
});
