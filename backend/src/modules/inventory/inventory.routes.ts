import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createItem,
  listItems,
  getItem,
  updateItem,
  deleteItem,
  adjustStock,
  listBalances,
  listMovements,
} from "./inventory.controller.js";
import {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  listInventoryItemsQuerySchema,
  inventoryItemIdParamSchema,
  adjustStockSchema,
  listBalancesQuerySchema,
  listMovementsQuerySchema,
} from "./inventory.validation.js";

const router = Router();
router.use(authenticate);

router.get("/", validate(listInventoryItemsQuerySchema, "query"), listItems);
router.post(
  "/",
  authorize("Owner", "Admin"),
  validate(createInventoryItemSchema),
  createItem
);
router.get("/balances", validate(listBalancesQuerySchema, "query"), listBalances);
router.get("/movements", validate(listMovementsQuerySchema, "query"), listMovements);
router.get("/:id", validate(inventoryItemIdParamSchema, "params"), getItem);
router.patch(
  "/:id",
  authorize("Owner", "Admin"),
  validate(inventoryItemIdParamSchema, "params"),
  validate(updateInventoryItemSchema),
  updateItem
);
router.delete(
  "/:id",
  authorize("Owner", "Admin"),
  validate(inventoryItemIdParamSchema, "params"),
  deleteItem
);
router.post(
  "/:id/adjust",
  authorize("Owner", "Admin"),
  validate(inventoryItemIdParamSchema, "params"),
  validate(adjustStockSchema),
  adjustStock
);

export default router;
