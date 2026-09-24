/**
 * Seed default permissions
 * Run: npm run prisma:seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_PERMISSIONS = [
  // Organization
  { code: "organization.view", name: "View Organization", module: "organization" },
  { code: "organization.update", name: "Update Organization", module: "organization" },

  // Branch
  { code: "branch.view", name: "View Branches", module: "branch" },
  { code: "branch.create", name: "Create Branch", module: "branch" },
  { code: "branch.update", name: "Update Branch", module: "branch" },
  { code: "branch.delete", name: "Delete Branch", module: "branch" },

  // User
  { code: "user.view", name: "View Users", module: "user" },
  { code: "user.create", name: "Create User", module: "user" },
  { code: "user.update", name: "Update User", module: "user" },
  { code: "user.delete", name: "Delete User", module: "user" },

  // Role & Permission
  { code: "role.view", name: "View Roles", module: "role" },
  { code: "role.create", name: "Create Role", module: "role" },
  { code: "role.update", name: "Update Role", module: "role" },
  { code: "role.delete", name: "Delete Role", module: "role" },
  { code: "permission.view", name: "View Permissions", module: "permission" },

  // Catalog
  { code: "product.view", name: "View Products", module: "product" },
  { code: "product.create", name: "Create Product", module: "product" },
  { code: "product.update", name: "Update Product", module: "product" },
  { code: "product.delete", name: "Delete Product", module: "product" },
  { code: "category.view", name: "View Categories", module: "category" },
  { code: "category.manage", name: "Manage Categories", module: "category" },

  // Order
  { code: "order.view", name: "View Orders", module: "order" },
  { code: "order.create", name: "Create Order", module: "order" },
  { code: "order.update", name: "Update Order", module: "order" },
  { code: "order.cancel", name: "Cancel Order", module: "order" },
  { code: "order.refund", name: "Refund Order", module: "order" },

  // Inventory
  { code: "inventory.view", name: "View Inventory", module: "inventory" },
  { code: "inventory.adjust", name: "Adjust Inventory", module: "inventory" },
  { code: "purchase.manage", name: "Manage Purchases", module: "purchase" },

  // Kitchen
  { code: "kitchen.view", name: "View Kitchen", module: "kitchen" },
  { code: "kitchen.manage", name: "Manage Kitchen Tickets", module: "kitchen" },

  // POS
  { code: "pos.access", name: "Access POS", module: "pos" },
  { code: "pos.shift", name: "Manage POS Shift", module: "pos" },

  // Customer
  { code: "customer.view", name: "View Customers", module: "customer" },
  { code: "customer.manage", name: "Manage Customers", module: "customer" },

  // Marketing
  { code: "marketing.view", name: "View Marketing", module: "marketing" },
  { code: "marketing.manage", name: "Manage Coupons/Promos", module: "marketing" },

  // Accounting
  { code: "accounting.view", name: "View Accounting", module: "accounting" },
  { code: "accounting.manage", name: "Manage Journals/Invoices", module: "accounting" },

  // Reports & Settings
  { code: "report.view", name: "View Reports", module: "report" },
  { code: "setting.view", name: "View Settings", module: "setting" },
  { code: "setting.update", name: "Update Settings", module: "setting" },
];

async function main() {
  console.log("🌱 Seeding permissions...");

  for (const perm of DEFAULT_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        name: perm.name,
        module: perm.module,
      },
      create: {
        code: perm.code,
        name: perm.name,
        module: perm.module,
        description: perm.name,
      },
    });
  }

  console.log(`✅ Seeded ${DEFAULT_PERMISSIONS.length} permissions`);
  console.log("");
  console.log("Next steps:");
  console.log("  1. Register via POST /api/v1/auth/register");
  console.log("  2. Login  via POST /api/v1/auth/login");
  console.log("  3. Create branches, products, then place orders");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
