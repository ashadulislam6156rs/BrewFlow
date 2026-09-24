import { Router } from "express";
import {
  register,
  login,
  googleAuth,
  refresh,
  me,
  changePassword,
} from "./auth.controller.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  refreshSchema,
  changePasswordSchema,
} from "./auth.validation.js";

const router = Router();

// Public routes
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/google", validate(googleAuthSchema), googleAuth);
router.post("/refresh", validate(refreshSchema), refresh);

// Protected routes
router.get("/me", authenticate, me);
router.post("/change-password", authenticate, validate(changePasswordSchema), changePassword);

export default router;
