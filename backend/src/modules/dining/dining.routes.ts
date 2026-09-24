import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createTable,
  listTables,
  updateTable,
  deleteTable,
  createReservation,
  listReservations,
  updateReservation,
  deleteReservation,
} from "./dining.controller.js";
import {
  createTableSchema,
  updateTableSchema,
  createReservationSchema,
  updateReservationSchema,
  listTablesQuerySchema,
  listReservationsQuerySchema,
  idParamSchema,
} from "./dining.validation.js";

const router = Router();
router.use(authenticate);

// Tables
router.get("/tables", validate(listTablesQuerySchema, "query"), listTables);
router.post(
  "/tables",
  authorize("Owner", "Admin"),
  validate(createTableSchema),
  createTable
);
router.patch(
  "/tables/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  validate(updateTableSchema),
  updateTable
);
router.delete(
  "/tables/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  deleteTable
);

// Reservations
router.get(
  "/reservations",
  validate(listReservationsQuerySchema, "query"),
  listReservations
);
router.post(
  "/reservations",
  authorize("Owner", "Admin"),
  validate(createReservationSchema),
  createReservation
);
router.patch(
  "/reservations/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  validate(updateReservationSchema),
  updateReservation
);
router.delete(
  "/reservations/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  deleteReservation
);

export default router;
