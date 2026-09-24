import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/AppError.js";
import { sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

export function notFoundHandler(req: Request, res: Response, _next: NextFunction) {
  return sendError(res, `Route ${req.method} ${req.originalUrl} not found`, 404);
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Operational AppError
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error("Non-operational error", { message: err.message, stack: err.stack });
    }
    return sendError(res, err.message, err.statusCode, err.errors);
  }

  // Zod validation
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    return sendError(res, "Validation failed", 422, errors);
  }

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return sendError(res, "Unique constraint violation", 409, {
        fields: err.meta?.target,
      });
    }
    if (err.code === "P2025") {
      return sendError(res, "Record not found", 404);
    }
    if (err.code === "P2003") {
      return sendError(res, "Foreign key constraint failed", 400);
    }
    logger.error("Prisma error", { code: err.code, meta: err.meta });
  }

  // Prisma validation
  if (err instanceof Prisma.PrismaClientValidationError) {
    return sendError(res, "Invalid data provided", 400);
  }

  // Unexpected errors
  logger.error("Unhandled error", {
    message: err.message,
    stack: env.NODE_ENV === "development" ? err.stack : undefined,
  });

  return sendError(
    res,
    env.NODE_ENV === "production" ? "Internal server error" : err.message,
    500
  );
}
