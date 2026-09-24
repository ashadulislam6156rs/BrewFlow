import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import type { JwtPayload } from "../middlewares/auth.middleware.js";

let io: Server | null = null;

export type SocketEvents = {
  // Client → Server
  "join:branch": (branchId: string) => void;
  "join:kitchen": (stationId: string) => void;
  "join:order": (orderId: string) => void;
  "leave:branch": (branchId: string) => void;
  "leave:kitchen": (stationId: string) => void;

  // Server → Client (emitted)
  "order:created": (payload: unknown) => void;
  "order:updated": (payload: unknown) => void;
  "order:status": (payload: unknown) => void;
  "kitchen:ticket": (payload: unknown) => void;
  "kitchen:ticket:status": (payload: unknown) => void;
  "kitchen:item:status": (payload: unknown) => void;
  "delivery:updated": (payload: unknown) => void;
  "notification": (payload: unknown) => void;
};

/**
 * Initialize Socket.IO on the HTTP server
 */
export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
      credentials: true,
      methods: ["GET", "POST"],
    },
    path: "/socket.io",
    transports: ["websocket", "polling"],
  });

  // Auth middleware for sockets
  io.use((socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string) ||
        (socket.handshake.headers?.authorization as string)?.replace(
          /^Bearer\s+/i,
          ""
        );

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user = socket.data.user as JwtPayload;
    logger.info(`Socket connected: ${socket.id} user=${user.userId}`);

    // Auto-join organization room
    const orgRoom = `org:${user.organizationId}`;
    socket.join(orgRoom);

    // Join user-specific room (for personal notifications)
    socket.join(`user:${user.userId}`);

    // ── Client events ──────────────────────────────────────
    socket.on("join:branch", (branchId: string) => {
      if (!branchId) return;
      socket.join(`branch:${branchId}`);
      logger.debug(`${socket.id} joined branch:${branchId}`);
    });

    socket.on("leave:branch", (branchId: string) => {
      socket.leave(`branch:${branchId}`);
    });

    socket.on("join:kitchen", (stationId: string) => {
      if (!stationId) return;
      socket.join(`kitchen:${stationId}`);
      logger.debug(`${socket.id} joined kitchen:${stationId}`);
    });

    socket.on("leave:kitchen", (stationId: string) => {
      socket.leave(`kitchen:${stationId}`);
    });

    socket.on("join:order", (orderId: string) => {
      if (!orderId) return;
      socket.join(`order:${orderId}`);
    });

    socket.on("disconnect", (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  logger.info("Socket.IO initialized");
  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initSocket first.");
  }
  return io;
}

// ── Emit helpers (safe no-op if socket not ready) ───────────

function safeEmit(
  room: string,
  event: string,
  payload: unknown
): void {
  if (!io) return;
  io.to(room).emit(event, payload);
}

export const socketEmit = {
  /** New order placed → branch + org */
  orderCreated(organizationId: string, branchId: string, order: unknown) {
    safeEmit(`org:${organizationId}`, "order:created", order);
    safeEmit(`branch:${branchId}`, "order:created", order);
  },

  /** Order status changed */
  orderStatus(
    organizationId: string,
    branchId: string,
    orderId: string,
    payload: unknown
  ) {
    safeEmit(`org:${organizationId}`, "order:status", payload);
    safeEmit(`branch:${branchId}`, "order:status", payload);
    safeEmit(`order:${orderId}`, "order:status", payload);
  },

  /** Full order update */
  orderUpdated(
    organizationId: string,
    branchId: string,
    orderId: string,
    order: unknown
  ) {
    safeEmit(`org:${organizationId}`, "order:updated", order);
    safeEmit(`branch:${branchId}`, "order:updated", order);
    safeEmit(`order:${orderId}`, "order:updated", order);
  },

  /** Kitchen ticket created / updated */
  kitchenTicket(stationId: string, ticket: unknown) {
    safeEmit(`kitchen:${stationId}`, "kitchen:ticket", ticket);
  },

  kitchenTicketStatus(stationId: string, payload: unknown) {
    safeEmit(`kitchen:${stationId}`, "kitchen:ticket:status", payload);
  },

  kitchenItemStatus(stationId: string, payload: unknown) {
    safeEmit(`kitchen:${stationId}`, "kitchen:item:status", payload);
  },

  /** Delivery status */
  deliveryUpdated(organizationId: string, branchId: string, payload: unknown) {
    safeEmit(`org:${organizationId}`, "delivery:updated", payload);
    if (branchId) safeEmit(`branch:${branchId}`, "delivery:updated", payload);
  },

  /** Personal notification */
  notification(userId: string, payload: unknown) {
    safeEmit(`user:${userId}`, "notification", payload);
  },
};
