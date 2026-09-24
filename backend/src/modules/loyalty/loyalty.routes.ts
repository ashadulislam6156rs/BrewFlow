import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createProgram,
  listPrograms,
  updateProgram,
  enroll,
  getAccount,
  listAccounts,
  earn,
  redeem,
  adjust,
  listTransactions,
} from "./loyalty.controller.js";
import {
  createProgramSchema,
  updateProgramSchema,
  enrollCustomerSchema,
  earnPointsSchema,
  redeemPointsSchema,
  adjustPointsSchema,
  listAccountsQuerySchema,
  idParamSchema,
} from "./loyalty.validation.js";
import { z } from "zod";

const router = Router();
router.use(authenticate);

// Programs
router.get("/programs", listPrograms);
router.post(
  "/programs",
  authorize("Owner", "Admin"),
  validate(createProgramSchema),
  createProgram
);
router.patch(
  "/programs/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  validate(updateProgramSchema),
  updateProgram
);

// Accounts
router.get("/accounts", validate(listAccountsQuerySchema, "query"), listAccounts);
router.post(
  "/enroll",
  authorize("Owner", "Admin"),
  validate(enrollCustomerSchema),
  enroll
);
router.get(
  "/accounts/:customerId",
  validate(z.object({ customerId: z.string().cuid() }), "params"),
  getAccount
);
router.get(
  "/accounts/:customerId/transactions",
  validate(z.object({ customerId: z.string().cuid() }), "params"),
  listTransactions
);

// Points operations
router.post(
  "/earn",
  authorize("Owner", "Admin"),
  validate(earnPointsSchema),
  earn
);
router.post(
  "/redeem",
  authorize("Owner", "Admin"),
  validate(redeemPointsSchema),
  redeem
);
router.post(
  "/adjust",
  authorize("Owner", "Admin"),
  validate(adjustPointsSchema),
  adjust
);

export default router;
