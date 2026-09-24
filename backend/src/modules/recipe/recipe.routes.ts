import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createRecipe,
  listRecipes,
  getRecipe,
  updateRecipe,
  deleteRecipe,
} from "./recipe.controller.js";
import {
  createRecipeSchema,
  updateRecipeSchema,
  listRecipesQuerySchema,
  recipeIdParamSchema,
} from "./recipe.validation.js";

const router = Router();
router.use(authenticate);

router.get("/", validate(listRecipesQuerySchema, "query"), listRecipes);
router.post(
  "/",
  authorize("Owner", "Admin"),
  validate(createRecipeSchema),
  createRecipe
);
router.get("/:id", validate(recipeIdParamSchema, "params"), getRecipe);
router.patch(
  "/:id",
  authorize("Owner", "Admin"),
  validate(recipeIdParamSchema, "params"),
  validate(updateRecipeSchema),
  updateRecipe
);
router.delete(
  "/:id",
  authorize("Owner", "Admin"),
  validate(recipeIdParamSchema, "params"),
  deleteRecipe
);

export default router;
