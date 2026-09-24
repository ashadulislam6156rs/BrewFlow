import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  addVariant,
  updateVariant,
  deleteVariant,
  addProductImage,
  removeProductImage,
  setProductBranches,
  setProductModifierGroups,
} from "./product.controller.js";
import {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
  productIdParamSchema,
  createVariantSchema,
  updateVariantSchema,
  addProductImageSchema,
  setProductBranchesSchema,
  setProductModifierGroupsSchema,
} from "./product.validation.js";
import { z } from "zod";

const router = Router();
router.use(authenticate);

router.get("/", validate(listProductsQuerySchema, "query"), listProducts);
router.post(
  "/",
  authorize("Owner", "Admin"),
  validate(createProductSchema),
  createProduct
);
router.get("/:id", validate(productIdParamSchema, "params"), getProduct);
router.patch(
  "/:id",
  authorize("Owner", "Admin"),
  validate(productIdParamSchema, "params"),
  validate(updateProductSchema),
  updateProduct
);
router.delete(
  "/:id",
  authorize("Owner", "Admin"),
  validate(productIdParamSchema, "params"),
  deleteProduct
);

// Variants
router.post(
  "/:id/variants",
  authorize("Owner", "Admin"),
  validate(productIdParamSchema, "params"),
  validate(createVariantSchema),
  addVariant
);
router.patch(
  "/:id/variants/:variantId",
  authorize("Owner", "Admin"),
  validate(
    z.object({ id: z.string().cuid(), variantId: z.string().cuid() }),
    "params"
  ),
  validate(updateVariantSchema),
  updateVariant
);
router.delete(
  "/:id/variants/:variantId",
  authorize("Owner", "Admin"),
  validate(
    z.object({ id: z.string().cuid(), variantId: z.string().cuid() }),
    "params"
  ),
  deleteVariant
);

// Images
router.post(
  "/:id/images",
  authorize("Owner", "Admin"),
  validate(productIdParamSchema, "params"),
  validate(addProductImageSchema),
  addProductImage
);
router.delete(
  "/:id/images/:imageId",
  authorize("Owner", "Admin"),
  validate(
    z.object({ id: z.string().cuid(), imageId: z.string().cuid() }),
    "params"
  ),
  removeProductImage
);

// Branch settings
router.put(
  "/:id/branches",
  authorize("Owner", "Admin"),
  validate(productIdParamSchema, "params"),
  validate(setProductBranchesSchema),
  setProductBranches
);

// Modifier groups
router.put(
  "/:id/modifier-groups",
  authorize("Owner", "Admin"),
  validate(productIdParamSchema, "params"),
  validate(setProductModifierGroupsSchema),
  setProductModifierGroups
);

export default router;
