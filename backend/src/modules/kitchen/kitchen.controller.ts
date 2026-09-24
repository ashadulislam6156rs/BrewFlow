import type { Request, Response } from "express";
import { kitchenService } from "./kitchen.service.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  CreateStationInput,
  UpdateStationInput,
  ListStationsQuery,
  CreateTicketInput,
  UpdateTicketStatusInput,
  UpdateTicketItemStatusInput,
  ListTicketsQuery,
} from "./kitchen.validation.js";

export const createStation = asyncHandler(async (req: Request, res: Response) => {
  const result = await kitchenService.createStation(
    req.user!.organizationId,
    req.body as CreateStationInput
  );
  return sendSuccess(res, result, "Kitchen station created", 201);
});

export const listStations = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListStationsQuery;
  const result = await kitchenService.listStations(
    req.user!.organizationId,
    query
  );
  return sendSuccess(res, result, "Kitchen stations fetched");
});

export const updateStation = asyncHandler(async (req: Request, res: Response) => {
  const result = await kitchenService.updateStation(
    req.user!.organizationId,
    req.params.id,
    req.body as UpdateStationInput
  );
  return sendSuccess(res, result, "Kitchen station updated");
});

export const deleteStation = asyncHandler(async (req: Request, res: Response) => {
  const result = await kitchenService.deleteStation(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Kitchen station deleted");
});

export const createTicket = asyncHandler(async (req: Request, res: Response) => {
  const result = await kitchenService.createTicket(
    req.user!.organizationId,
    req.body as CreateTicketInput
  );
  return sendSuccess(res, result, "Kitchen ticket created", 201);
});

export const createTicketsForOrder = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId, stationId } = req.body as {
      orderId: string;
      stationId?: string;
    };
    const result = await kitchenService.createTicketsForOrder(
      req.user!.organizationId,
      orderId,
      stationId
    );
    return sendSuccess(res, result, "Kitchen tickets created for order", 201);
  }
);

export const listTickets = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListTicketsQuery;
  const { items, total, page, limit } = await kitchenService.listTickets(
    req.user!.organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Kitchen tickets fetched");
});

export const getTicket = asyncHandler(async (req: Request, res: Response) => {
  const result = await kitchenService.getTicketById(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Kitchen ticket fetched");
});

export const updateTicketStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await kitchenService.updateTicketStatus(
      req.user!.organizationId,
      req.params.id,
      req.body as UpdateTicketStatusInput
    );
    return sendSuccess(res, result, "Ticket status updated");
  }
);

export const updateTicketItemStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await kitchenService.updateTicketItemStatus(
      req.user!.organizationId,
      req.params.id,
      req.params.itemId,
      req.body as UpdateTicketItemStatusInput
    );
    return sendSuccess(res, result, "Ticket item status updated");
  }
);
