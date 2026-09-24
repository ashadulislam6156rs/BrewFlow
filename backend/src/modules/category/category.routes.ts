import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createCategory,
  listCategories,
  getCategory,
  updateCategory,
  deleteCategory,
} from "./category.controller.js";
import {
  createCategorySchema,
  updateCategorySchema,
  listCategoriesQuerySchema,
  categoryIdParamSchema,
} from "./category.validation.js";

const router = Router();
router.use(authenticate);

router.get("/", validate(listCategoriesQuerySchema, "query"), listCategories);
router.post(
  "/",
  authorize("Owner", "Admin"),
  validate(createCategorySchema),
  createCategory
);
router.get("/:id", validate(categoryIdParamSchema, "params"), getCategory);
router.patch(
  "/:id",
  authorize("Owner", "Admin"),
  validate(categoryIdParamSchema, "params"),
  validate(updateCategorySchema),
  updateCategory
);
router.delete(
  "/:id",
  authorize("Owner", "Admin"),
  validate(categoryIdParamSchema, "params"),
  deleteCategory
);

export default router;
