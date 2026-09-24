import type { Request, Response } from "express";
import { notificationService } from "./notification.service.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  CreateNotificationInput,
  ListNotificationsQuery,
} from "./notification.validation.js";

export const createNotification = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await notificationService.create(
      req.user!.organizationId,
      req.body as CreateNotificationInput
    );
    return sendSuccess(res, result, "Notification created", 201);
  }
);

export const listNotifications = asyncHandler(
  async (req: Request, res: Response) => {
    const query = req.query as unknown as ListNotificationsQuery;
    const { items, total, page, limit, unreadCount } =
      await notificationService.listForUser(
        req.user!.organizationId,
        req.user!.userId,
        query
      );
    return sendSuccess(res, items, "Notifications fetched", 200, {
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
);

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const result = await notificationService.markRead(
    req.user!.organizationId,
    req.user!.userId,
    req.params.id
  );
  return sendSuccess(res, result, "Notification marked as read");
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  const result = await notificationService.markAllRead(
    req.user!.organizationId,
    req.user!.userId
  );
  return sendSuccess(res, result, "All notifications marked as read");
});
