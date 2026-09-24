import type { Request, Response } from "express";
import { categoryService } from "./category.service.js";
import { sendSuccess } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  ListCategoriesQuery,
} from "./category.validation.js";

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const result = await categoryService.create(
    req.user!.organizationId,
    req.body as CreateCategoryInput
  );
  return sendSuccess(res, result, "Category created successfully", 201);
});

export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListCategoriesQuery;
  const result = await categoryService.list(req.user!.organizationId, query);
  return sendSuccess(res, result, "Categories fetched successfully");
});

export const getCategory = asyncHandler(async (req: Request, res: Response) => {
  const result = await categoryService.getById(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Category fetched successfully");
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const result = await categoryService.update(
    req.user!.organizationId,
    req.params.id,
    req.body as UpdateCategoryInput
  );
  return sendSuccess(res, result, "Category updated successfully");
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const result = await categoryService.delete(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Category deleted successfully");
});
