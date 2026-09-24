import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  addAddress,
  updateAddress,
  deleteAddress,
} from "./customer.controller.js";
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuerySchema,
  customerIdParamSchema,
  createAddressSchema,
  updateAddressSchema,
} from "./customer.validation.js";
import { z } from "zod";

const router = Router();
router.use(authenticate);

router.get("/", validate(listCustomersQuerySchema, "query"), listCustomers);
router.post(
  "/",
  authorize("Owner", "Admin"),
  validate(createCustomerSchema),
  createCustomer
);
router.get("/:id", validate(customerIdParamSchema, "params"), getCustomer);
router.patch(
  "/:id",
  authorize("Owner", "Admin"),
  validate(customerIdParamSchema, "params"),
  validate(updateCustomerSchema),
  updateCustomer
);
router.delete(
  "/:id",
  authorize("Owner", "Admin"),
  validate(customerIdParamSchema, "params"),
  deleteCustomer
);

// Addresses
router.post(
  "/:id/addresses",
  authorize("Owner", "Admin"),
  validate(customerIdParamSchema, "params"),
  validate(createAddressSchema),
  addAddress
);
router.patch(
  "/:id/addresses/:addressId",
  authorize("Owner", "Admin"),
  validate(
    z.object({ id: z.string().cuid(), addressId: z.string().cuid() }),
    "params"
  ),
  validate(updateAddressSchema),
  updateAddress
);
router.delete(
  "/:id/addresses/:addressId",
  authorize("Owner", "Admin"),
  validate(
    z.object({ id: z.string().cuid(), addressId: z.string().cuid() }),
    "params"
  ),
  deleteAddress
);

export default router;
