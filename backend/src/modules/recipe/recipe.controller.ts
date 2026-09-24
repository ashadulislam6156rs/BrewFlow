import type { Request, Response } from "express";
import { recipeService } from "./recipe.service.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  CreateRecipeInput,
  UpdateRecipeInput,
  ListRecipesQuery,
} from "./recipe.validation.js";

export const createRecipe = asyncHandler(async (req: Request, res: Response) => {
  const result = await recipeService.create(
    req.user!.organizationId,
    req.body as CreateRecipeInput
  );
  return sendSuccess(res, result, "Recipe created successfully", 201);
});

export const listRecipes = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListRecipesQuery;
  const { items, total, page, limit } = await recipeService.list(
    req.user!.organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Recipes fetched");
});

export const getRecipe = asyncHandler(async (req: Request, res: Response) => {
  const result = await recipeService.getById(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Recipe fetched successfully");
});

export const updateRecipe = asyncHandler(async (req: Request, res: Response) => {
  const result = await recipeService.update(
    req.user!.organizationId,
    req.params.id,
    req.body as UpdateRecipeInput
  );
  return sendSuccess(res, result, "Recipe updated successfully");
});

export const deleteRecipe = asyncHandler(async (req: Request, res: Response) => {
  const result = await recipeService.delete(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Recipe deleted successfully");
});
