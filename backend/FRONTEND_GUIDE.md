# Frontend Integration Guide

Base URL: `http://localhost:5000/api/v1`  
Auth: `Authorization: Bearer <accessToken>`

---

## 1. Auth flow

```ts
// Register
POST /auth/register
{
  "email": "owner@demo.com",
  "password": "Password123!",
  "firstName": "Demo",
  "lastName": "Owner",
  "organizationName": "My Cafe"
}

// Login
POST /auth/login
{ "email": "...", "password": "..." }
// → { data: { accessToken, refreshToken, user } }

// Refresh
POST /auth/refresh
{ "refreshToken": "..." }

// Me
GET /auth/me
```

Store tokens (memory + httpOnly cookie or secure storage).  
Attach `Authorization: Bearer ${accessToken}` on every API call.

---

## 2. Typical bootstrap after login

```
1. GET /branches
2. GET /products?branchId=...
3. GET /categories
4. GET /pos/shifts/current?branchId=...
5. GET /kitchen/stations?branchId=...
6. Connect Socket.IO (see §5)
```

---

## 3. Core API map (by screen)

### POS / Order

| Action | Method | Path |
|--------|--------|------|
| Create cart | POST | `/carts` |
| Add item | POST | `/carts/:token/items` |
| Place order | POST | `/orders` body: `{ branchId, orderType, cartToken }` or `items[]` |
| List orders | GET | `/orders?branchId=&status=` |
| Change status | PATCH | `/orders/:id/status` |
| Add payment | POST | `/orders/:id/payments` |
| Refund | POST | `/orders/:id/refunds` |

### Kitchen display

| Action | Method | Path |
|--------|--------|------|
| List stations | GET | `/kitchen/stations?branchId=` |
| Tickets | GET | `/kitchen/tickets?stationId=&status=` |
| From order | POST | `/kitchen/tickets/from-order` `{ orderId }` |
| Ticket status | PATCH | `/kitchen/tickets/:id/status` |
| Item status | PATCH | `/kitchen/tickets/:id/items/:itemId/status` |

### Catalog

| Action | Method | Path |
|--------|--------|------|
| Products | GET/POST | `/products` |
| Categories | GET/POST | `/categories` |
| Modifiers | GET/POST | `/modifier-groups` |

### Customers

| Action | Method | Path |
|--------|--------|------|
| CRUD | | `/customers` |
| Addresses | POST | `/customers/:id/addresses` |

### POS shift

| Action | Method | Path |
|--------|--------|------|
| Open | POST | `/pos/shifts` |
| Current | GET | `/pos/shifts/current` |
| Close | POST | `/pos/shifts/:id/close` |
| Cash in/out | POST | `/pos/shifts/:id/cash` |

### Coupons / Loyalty

| Action | Method | Path |
|--------|--------|------|
| Validate coupon | POST | `/marketing/coupons/validate` |
| Redeem | POST | `/marketing/coupons/redeem` |
| Earn points | POST | `/loyalty/earn` |
| Redeem points | POST | `/loyalty/redeem` |

### Media (Cloudinary)

```
1. Upload file to Cloudinary (client-side or signed upload)
2. POST /media { publicId, secureUrl, width, height, ... }
3. Use returned asset.id on product/logo/banner
```

---

## 4. Response shape

```json
{
  "success": true,
  "message": "...",
  "data": { },
  "meta": {
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

Errors:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": { }
}
```

---

## 5. Socket.IO (real-time)

### Connect (React example)

```bash
npm install socket.io-client
```

```ts
import { io, Socket } from "socket.io-client";

const socket: Socket = io("http://localhost:5000", {
  path: "/socket.io",
  auth: { token: accessToken }, // required
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("connected", socket.id);
  // Join rooms for this screen
  socket.emit("join:branch", branchId);
  socket.emit("join:kitchen", stationId); // KDS only
});

socket.on("disconnect", () => console.log("disconnected"));
```

### Events to listen

| Event | When | Payload |
|-------|------|---------|
| `order:created` | New order | full order object |
| `order:status` | Status change | `{ orderId, fromStatus, toStatus, order }` |
| `order:updated` | Payment / refund etc. | order |
| `kitchen:ticket` | New kitchen ticket | ticket + items |
| `kitchen:ticket:status` | Ticket status | `{ ticketId, status, ticket }` |
| `kitchen:item:status` | Item status | payload |
| `delivery:updated` | Delivery change | delivery |
| `notification` | Personal notif | notification |

### Rooms (auto / manual)

| Room | How |
|------|-----|
| `org:{organizationId}` | Auto on connect |
| `user:{userId}` | Auto on connect |
| `branch:{branchId}` | `emit("join:branch", id)` |
| `kitchen:{stationId}` | `emit("join:kitchen", id)` |
| `order:{orderId}` | `emit("join:order", id)` |

### Kitchen Display example

```ts
socket.emit("join:kitchen", stationId);

socket.on("kitchen:ticket", (ticket) => {
  // prepend to queue UI
});

socket.on("kitchen:ticket:status", ({ ticketId, status, ticket }) => {
  // update card in UI
});
```

### POS / Order board example

```ts
socket.emit("join:branch", branchId);

socket.on("order:created", (order) => {
  // new order sound + list insert
});

socket.on("order:status", ({ orderId, toStatus, order }) => {
  // update status badge
});
```

---

## 6. Suggested frontend stack

- **Next.js / React** + TanStack Query
- **socket.io-client** for live updates
- **Zustand / Redux** for auth + active branch
- Cloudinary Upload Widget for media

### Auth header helper

```ts
async function api(path: string, options: RequestInit = {}) {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json;
}
```

### Token refresh

On `401`, call `POST /auth/refresh` with `refreshToken`, store new access token, retry once.

---

## 7. Order lifecycle (UI states)

```
PENDING → CONFIRMED → PREPARING → READY
       → OUT_FOR_DELIVERY → DELIVERED → COMPLETED
       ↘ CANCELLED / REJECTED
```

Mirror these on POS board + Kitchen board.  
Kitchen tickets: `QUEUED → ACCEPTED → PREPARING → READY → COMPLETED`.

---

## 8. CORS

Backend `.env`:

```env
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

Must match your frontend origin exactly when using credentials.

---

## 9. Quick checklist

- [ ] Login → store tokens
- [ ] Select branch → join socket room
- [ ] Load products / modifiers
- [ ] Open POS shift (cash drawer)
- [ ] Create order from cart
- [ ] Kitchen receives `kitchen:ticket` / auto from-order
- [ ] Status updates via REST + socket
- [ ] Payment + optional coupon/loyalty
- [ ] Close shift at end of day
