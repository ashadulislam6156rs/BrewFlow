import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createStation,
  listStations,
  updateStation,
  deleteStation,
  createTicket,
  createTicketsForOrder,
  listTickets,
  getTicket,
  updateTicketStatus,
  updateTicketItemStatus,
} from "./kitchen.controller.js";
import {
  createStationSchema,
  updateStationSchema,
  listStationsQuerySchema,
  createTicketSchema,
  updateTicketStatusSchema,
  updateTicketItemStatusSchema,
  listTicketsQuerySchema,
  idParamSchema,
} from "./kitchen.validation.js";
import { z } from "zod";

const router = Router();
router.use(authenticate);

// Stations
router.get("/stations", validate(listStationsQuerySchema, "query"), listStations);
router.post(
  "/stations",
  authorize("Owner", "Admin"),
  validate(createStationSchema),
  createStation
);
router.patch(
  "/stations/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  validate(updateStationSchema),
  updateStation
);
router.delete(
  "/stations/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  deleteStation
);

// Tickets
router.get("/tickets", validate(listTicketsQuerySchema, "query"), listTickets);
router.post(
  "/tickets",
  authorize("Owner", "Admin"),
  validate(createTicketSchema),
  createTicket
);
router.post(
  "/tickets/from-order",
  authorize("Owner", "Admin"),
  validate(
    z.object({
      orderId: z.string().cuid(),
      stationId: z.string().cuid().optional(),
    })
  ),
  createTicketsForOrder
);
router.get("/tickets/:id", validate(idParamSchema, "params"), getTicket);
router.patch(
  "/tickets/:id/status",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  validate(updateTicketStatusSchema),
  updateTicketStatus
);
router.patch(
  "/tickets/:id/items/:itemId/status",
  authorize("Owner", "Admin"),
  validate(
    z.object({ id: z.string().cuid(), itemId: z.string().cuid() }),
    "params"
  ),
  validate(updateTicketItemStatusSchema),
  updateTicketItemStatus
);

export default router;
