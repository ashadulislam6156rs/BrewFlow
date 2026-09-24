import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  registerAsset,
  listAssets,
  getAsset,
  updateAsset,
  deleteAsset,
  listPendingDelete,
  confirmDeleted,
} from "./media.controller.js";
import {
  registerAssetSchema,
  updateAssetSchema,
  listAssetsQuerySchema,
  idParamSchema,
} from "./media.validation.js";

const router = Router();
router.use(authenticate);

router.get("/", validate(listAssetsQuerySchema, "query"), listAssets);
router.post(
  "/",
  authorize("Owner", "Admin"),
  validate(registerAssetSchema),
  registerAsset
);
router.get(
  "/pending-delete",
  authorize("Owner", "Admin"),
  listPendingDelete
);
router.get("/:id", validate(idParamSchema, "params"), getAsset);
router.patch(
  "/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  validate(updateAssetSchema),
  updateAsset
);
router.delete(
  "/:id",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  deleteAsset
);
router.post(
  "/:id/confirm-deleted",
  authorize("Owner", "Admin"),
  validate(idParamSchema, "params"),
  confirmDeleted
);

export default router;
