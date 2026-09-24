import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import routes from "./modules/index.js";
import { notFoundHandler, errorHandler } from "./middlewares/error.middleware.js";
import { logger } from "./utils/logger.js";

const app = express();

// ======================
// Security & Performance
// ======================
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
    credentials: true,
  })
);
app.use(compression());

// ======================
// Rate Limiting
// ======================
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});
app.use(limiter);

// ======================
// Body Parsing
// ======================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ======================
// Logging
// ======================
if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      stream: {
        write: (message: string) => logger.http(message.trim()),
      },
    })
  );
}

// ======================
// Trust Proxy (for production behind reverse proxy)
// ======================
if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// ======================
// Routes
// ======================
app.use(env.API_PREFIX, routes);

// ======================
// Error Handling
// ======================
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
