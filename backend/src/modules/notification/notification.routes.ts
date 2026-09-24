import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createNotification,
  listNotifications,
  markRead,
  markAllRead,
} from "./notification.controller.js";
import {
  createNotificationSchema,
  listNotificationsQuerySchema,
  idParamSchema,
} from "./notification.validation.js";

const router = Router();
router.use(authenticate);

router.get("/", validate(listNotificationsQuerySchema, "query"), listNotifications);
router.post(
  "/",
  authorize("Owner", "Admin"),
  validate(createNotificationSchema),
  createNotification
);
router.patch("/read-all", markAllRead);
router.patch("/:id/read", validate(idParamSchema, "params"), markRead);

export default router;
