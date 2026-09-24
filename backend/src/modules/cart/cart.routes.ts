import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  getOrCreateCart,
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
} from "./cart.controller.js";
import {
  getOrCreateCartSchema,
  addCartItemSchema,
  updateCartItemSchema,
  cartTokenParamSchema,
  cartItemParamSchema,
} from "./cart.validation.js";

const router = Router();
router.use(authenticate);

router.post("/", validate(getOrCreateCartSchema), getOrCreateCart);
router.get("/:token", validate(cartTokenParamSchema, "params"), getCart);
router.post(
  "/:token/items",
  validate(cartTokenParamSchema, "params"),
  validate(addCartItemSchema),
  addCartItem
);
router.patch(
  "/:token/items/:itemId",
  validate(cartItemParamSchema, "params"),
  validate(updateCartItemSchema),
  updateCartItem
);
router.delete(
  "/:token/items/:itemId",
  validate(cartItemParamSchema, "params"),
  removeCartItem
);
router.delete(
  "/:token",
  validate(cartTokenParamSchema, "params"),
  clearCart
);

export default router;
