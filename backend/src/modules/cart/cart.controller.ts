import type { Request, Response } from "express";
import { cartService } from "./cart.service.js";
import { sendSuccess } from "../../utils/response.js";
import { asyncHandler } from "../../middlewares/asyncHandler.js";
import type {
  GetOrCreateCartInput,
  AddCartItemInput,
  UpdateCartItemInput,
} from "./cart.validation.js";

export const getOrCreateCart = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await cartService.getOrCreate(
      req.user!.organizationId,
      req.body as GetOrCreateCartInput
    );
    return sendSuccess(res, result, "Cart ready");
  }
);

export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const result = await cartService.getByToken(
    req.user!.organizationId,
    req.params.token
  );
  return sendSuccess(res, result, "Cart fetched");
});

export const addCartItem = asyncHandler(async (req: Request, res: Response) => {
  const result = await cartService.addItem(
    req.user!.organizationId,
    req.params.token,
    req.body as AddCartItemInput
  );
  return sendSuccess(res, result, "Item added to cart");
});

export const updateCartItem = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await cartService.updateItem(
      req.user!.organizationId,
      req.params.token,
      req.params.itemId,
      req.body as UpdateCartItemInput
    );
    return sendSuccess(res, result, "Cart item updated");
  }
);

export const removeCartItem = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await cartService.removeItem(
      req.user!.organizationId,
      req.params.token,
      req.params.itemId
    );
    return sendSuccess(res, result, "Cart item removed");
  }
);

export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  const result = await cartService.clear(
    req.user!.organizationId,
    req.params.token
  );
  return sendSuccess(res, result, "Cart cleared");
});
