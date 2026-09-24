import { Router } from "express";

import healthRoutes from "./health/health.routes.js";
import authRoutes from "./auth/auth.routes.js";
import organizationRoutes from "./organization/organization.routes.js";
import branchRoutes from "./branch/branch.routes.js";
import roleRoutes from "./role/role.routes.js";
import permissionRoutes from "./permission/permission.routes.js";
import userRoutes from "./user/user.routes.js";
import settingRoutes from "./setting/setting.routes.js";
import categoryRoutes from "./category/category.routes.js";
import unitRoutes, { unitConversionRouter } from "./unit/unit.routes.js";
import modifierRoutes from "./modifier/modifier.routes.js";
import productRoutes from "./product/product.routes.js";
import inventoryRoutes from "./inventory/inventory.routes.js";
import recipeRoutes from "./recipe/recipe.routes.js";
import supplierRoutes from "./supplier/supplier.routes.js";
import purchaseRoutes from "./purchase/purchase.routes.js";
import transferRoutes from "./transfer/transfer.routes.js";
import customerRoutes from "./customer/customer.routes.js";
import deliveryRoutes from "./delivery/delivery.routes.js";
import diningRoutes from "./dining/dining.routes.js";
import cartRoutes from "./cart/cart.routes.js";
import orderRoutes from "./order/order.routes.js";
import kitchenRoutes from "./kitchen/kitchen.routes.js";
import posRoutes from "./pos/pos.routes.js";
import marketingRoutes from "./marketing/marketing.routes.js";
import loyaltyRoutes from "./loyalty/loyalty.routes.js";
import reviewRoutes from "./review/review.routes.js";
import accountingRoutes from "./accounting/accounting.routes.js";
import notificationRoutes from "./notification/notification.routes.js";
import auditRoutes from "./audit/audit.routes.js";
import mediaRoutes from "./media/media.routes.js";

const router = Router();

// Health
router.use("/health", healthRoutes);

// Auth
router.use("/auth", authRoutes);

// Phase 1 – Foundation
router.use("/organizations", organizationRoutes);
router.use("/branches", branchRoutes);
router.use("/roles", roleRoutes);
router.use("/permissions", permissionRoutes);
router.use("/users", userRoutes);

// Phase 2 – Settings + Catalog
router.use("/settings", settingRoutes);
router.use("/categories", categoryRoutes);
router.use("/units", unitRoutes);
router.use("/unit-conversions", unitConversionRouter);
router.use("/modifier-groups", modifierRoutes);
router.use("/products", productRoutes);

// Phase 3 – Inventory + Procurement
router.use("/inventory", inventoryRoutes);
router.use("/recipes", recipeRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/purchases", purchaseRoutes);
router.use("/stock-transfers", transferRoutes);

// Phase 4 – Customer + Order
router.use("/customers", customerRoutes);
router.use("/delivery", deliveryRoutes);
router.use("/dining", diningRoutes);
router.use("/carts", cartRoutes);
router.use("/orders", orderRoutes);

// Phase 5 – Kitchen + POS
router.use("/kitchen", kitchenRoutes);
router.use("/pos", posRoutes);

// Phase 6 – Marketing & Loyalty
router.use("/marketing", marketingRoutes);
router.use("/loyalty", loyaltyRoutes);
router.use("/reviews", reviewRoutes);

// Phase 7 – Accounting + System
router.use("/accounting", accountingRoutes);
router.use("/notifications", notificationRoutes);
router.use("/audit-logs", auditRoutes);

// Phase 8 – System / Media
router.use("/media", mediaRoutes);

export default router;
