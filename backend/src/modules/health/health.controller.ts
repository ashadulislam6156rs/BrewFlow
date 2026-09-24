import type { Request, Response } from "express";
import { prisma } from "../../config/database.js";
import { sendSuccess } from "../../utils/response.js";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";

export const healthCheck = asyncHandler(async (_req: Request, res: Response) => {
  // Check DB connectivity
  let dbStatus = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "error";
  }

  return sendSuccess(
    res,
    {
      status: dbStatus === "ok" ? "healthy" : "degraded",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      database: dbStatus,
      version: "1.0.0",
    },
    "Health check"
  );
});
