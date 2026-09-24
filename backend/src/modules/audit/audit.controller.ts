import type { Request, Response } from "express";
import { auditService } from "./audit.service.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type { ListAuditQuery } from "./audit.validation.js";

export const listAuditLogs = asyncHandler(
  async (req: Request, res: Response) => {
    const query = req.query as unknown as ListAuditQuery;
    const { items, total, page, limit } = await auditService.list(
      req.user!.organizationId,
      query
    );
    return sendPaginated(res, items, total, page, limit, "Audit logs fetched");
  }
);
