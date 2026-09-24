# Local Setup – Migrate, Seed & Run

## Prerequisites

- **Node.js ≥ 20**
- **MySQL 8** or **MariaDB 10.5+**
- (Optional) Redis

## 1. Install dependencies

```bash
cd backend
npm install
```

## 2. Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/restaurant_pos"
JWT_ACCESS_SECRET=change-me-to-a-long-random-string-at-least-32-chars
JWT_REFRESH_SECRET=change-me-to-another-long-random-string-32plus
CORS_ORIGIN=http://localhost:3000
PORT=5000
API_PREFIX=/api/v1
```

Create the database:

```sql
CREATE DATABASE restaurant_pos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 3. Prisma generate + migrate

```bash
npx prisma generate
npx prisma migrate dev --name init
```

If you already have schema applied:

```bash
npx prisma db push
npx prisma generate
```

## 4. Seed permissions

```bash
npm run prisma:seed
```

Expected output:

```
🌱 Seeding permissions...
✅ Seeded 40+ permissions
```

## 5. Run the API

```bash
npm run dev
```

You should see:

```
✅ Database connected successfully
🚀 RestaurantPOS API running on port 5000
🔗 API: http://localhost:5000/api/v1
❤️  Health: http://localhost:5000/api/v1/health
🔌 Socket.IO: http://localhost:5000/socket.io
```

## 6. Smoke tests

```bash
# Health
curl http://localhost:5000/api/v1/health

# Register
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@demo.com",
    "password": "Password123!",
    "firstName": "Demo",
    "lastName": "Owner",
    "organizationName": "Demo Restaurant"
  }'

# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@demo.com","password":"Password123!"}'
```

Save the `accessToken` from login response for authenticated requests:

```bash
export TOKEN="eyJ..."

curl http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## 7. Production deploy

```bash
npm run build
npx prisma migrate deploy
npm run prisma:seed
npm run start:prod
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `DATABASE_URL is required` | Set it in `.env` |
| Prisma P1001 connection refused | MySQL not running / wrong host |
| JWT secret too short | Min 32 characters |
| CORS errors from frontend | Add frontend origin to `CORS_ORIGIN` (comma-separated) |
