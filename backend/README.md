# Restaurant / POS Backend API

Production-ready **Node.js + Express + TypeScript + Prisma** backend with **module-based** architecture.

## Tech Stack

- **Runtime**: Node.js ≥ 20
- **Framework**: Express 5
- **Language**: TypeScript (strict)
- **ORM**: Prisma 7 (MySQL / MariaDB)
- **Validation**: Zod
- **Auth**: JWT (Access + Refresh) + Google OAuth
- **Security**: Helmet, CORS, Rate Limiting, Compression

## Modules (Complete)

| Phase | Modules |
|-------|---------|
| 1 | Auth, Organization, Branch, Role, Permission, User |
| 2 | Setting, Category, Unit, Modifier, Product |
| 3 | Inventory, Recipe, Supplier, Purchase, StockTransfer |
| 4 | Customer, Delivery, Dining, Cart, Order |
| 5 | Kitchen, POS |
| 6 | Marketing (Tax/Discount/Coupon), Loyalty, Review |
| 7 | Accounting, Notification, AuditLog |

## Folder Structure

```
src/modules/{name}/
  {name}.controller.ts
  {name}.service.ts
  {name}.routes.ts
  {name}.validation.ts
  {name}.types.ts
```

## Getting Started

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

Health: `GET /api/v1/health`
