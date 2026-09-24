import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createSupplier,
  listSuppliers,
  getSupplier,
  updateSupplier,
  deleteSupplier,
} from "./supplier.controller.js";
import {
  createSupplierSchema,
  updateSupplierSchema,
  listSuppliersQuerySchema,
  supplierIdParamSchema,
} from "./supplier.validation.js";

const router = Router();
router.use(authenticate);

router.get("/", validate(listSuppliersQuerySchema, "query"), listSuppliers);
router.post(
  "/",
  authorize("Owner", "Admin"),
  validate(createSupplierSchema),
  createSupplier
);
router.get("/:id", validate(supplierIdParamSchema, "params"), getSupplier);
router.patch(
  "/:id",
  authorize("Owner", "Admin"),
  validate(supplierIdParamSchema, "params"),
  validate(updateSupplierSchema),
  updateSupplier
);
router.delete(
  "/:id",
  authorize("Owner", "Admin"),
  validate(supplierIdParamSchema, "params"),
  deleteSupplier
);

export default router;
