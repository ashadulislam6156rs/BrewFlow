import type { Request, Response } from "express";
import { productService } from "./product.service.js";
import { sendSuccess, sendPaginated } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  CreateProductInput,
  UpdateProductInput,
  ListProductsQuery,
  CreateVariantInput,
  UpdateVariantInput,
  AddProductImageInput,
  SetProductBranchesInput,
  SetProductModifierGroupsInput,
} from "./product.validation.js";

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const result = await productService.create(
    req.user!.organizationId,
    req.body as CreateProductInput
  );
  return sendSuccess(res, result, "Product created successfully", 201);
});

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListProductsQuery;
  const { items, total, page, limit } = await productService.list(
    req.user!.organizationId,
    query
  );
  return sendPaginated(res, items, total, page, limit, "Products fetched successfully");
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const result = await productService.getById(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Product fetched successfully");
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const result = await productService.update(
    req.user!.organizationId,
    req.params.id,
    req.body as UpdateProductInput
  );
  return sendSuccess(res, result, "Product updated successfully");
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const result = await productService.delete(
    req.user!.organizationId,
    req.params.id
  );
  return sendSuccess(res, result, "Product deleted successfully");
});

// Variants
export const addVariant = asyncHandler(async (req: Request, res: Response) => {
  const result = await productService.addVariant(
    req.user!.organizationId,
    req.params.id,
    req.body as CreateVariantInput
  );
  return sendSuccess(res, result, "Variant added successfully", 201);
});

export const updateVariant = asyncHandler(async (req: Request, res: Response) => {
  const result = await productService.updateVariant(
    req.user!.organizationId,
    req.params.id,
    req.params.variantId,
    req.body as UpdateVariantInput
  );
  return sendSuccess(res, result, "Variant updated successfully");
});

export const deleteVariant = asyncHandler(async (req: Request, res: Response) => {
  const result = await productService.deleteVariant(
    req.user!.organizationId,
    req.params.id,
    req.params.variantId
  );
  return sendSuccess(res, result, "Variant deleted successfully");
});

// Images
export const addProductImage = asyncHandler(async (req: Request, res: Response) => {
  const result = await productService.addImage(
    req.user!.organizationId,
    req.params.id,
    req.body as AddProductImageInput
  );
  return sendSuccess(res, result, "Image added successfully", 201);
});

export const removeProductImage = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await productService.removeImage(
      req.user!.organizationId,
      req.params.id,
      req.params.imageId
    );
    return sendSuccess(res, result, "Image removed successfully");
  }
);

// Branches
export const setProductBranches = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await productService.setBranches(
      req.user!.organizationId,
      req.params.id,
      req.body as SetProductBranchesInput
    );
    return sendSuccess(res, result, "Product branches updated successfully");
  }
);

// Modifier groups
export const setProductModifierGroups = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await productService.setModifierGroups(
      req.user!.organizationId,
      req.params.id,
      req.body as SetProductModifierGroupsInput
    );
    return sendSuccess(res, result, "Product modifier groups updated successfully");
  }
);
