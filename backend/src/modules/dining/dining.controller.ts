import type { Request, Response } from "express";
import { diningService } from "./dining.service.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  CreateTableInput,
  UpdateTableInput,
  CreateReservationInput,
  UpdateReservationInput,
  ListTablesQuery,
  ListReservationsQuery,
} from "./dining.validation.js";

export const createTable = asyncHandler(async (req: Request, res: Response) => {
  const result = await diningService.createTable(
    req.user!.organizationId,
    req.body as CreateTableInput
  );
  return sendSuccess(res, result, "Table created", 201);
});

export const listTables = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListTablesQuery;
  const result = await diningService.listTables(req.user!.organizationId, query);
  return sendSuccess(res, result, "Tables fetched");
});

export const updateTable = asyncHandler(async (req: Request, res: Response) => {
  const result = await diningService.updateTable(
    req.user!.organizationId,
    req.params.id,
    req.body as UpdateTableInput
  );
  return sendSuccess(res, result, "Table updated");
});

export const deleteTable = asyncHandler(async (req: Request, res: Response) => {
  const result = await diningService.deleteTable(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Table deleted");
});

export const createReservation = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await diningService.createReservation(
      req.user!.organizationId,
      req.body as CreateReservationInput
    );
    return sendSuccess(res, result, "Reservation created", 201);
  }
);

export const listReservations = asyncHandler(
  async (req: Request, res: Response) => {
    const query = req.query as unknown as ListReservationsQuery;
    const { items, total, page, limit } = await diningService.listReservations(
      req.user!.organizationId,
      query
    );
    return sendPaginated(res, items, total, page, limit, "Reservations fetched");
  }
);

export const updateReservation = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await diningService.updateReservation(
      req.user!.organizationId,
      req.params.id,
      req.body as UpdateReservationInput
    );
    return sendSuccess(res, result, "Reservation updated");
  }
);

export const deleteReservation = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await diningService.deleteReservation(
      req.user!.organizationId,
      req.params.id
    );
    return sendSuccess(res, result, "Reservation cancelled");
  }
);
