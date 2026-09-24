import { createServer } from "http";
import app from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { logger } from "./utils/logger.js";
import { initSocket } from "./socket/index.js";

async function bootstrap() {
  try {
    await connectDatabase();

    const httpServer = createServer(app);

    // Socket.IO on same HTTP server
    initSocket(httpServer);

    httpServer.listen(env.PORT, () => {
      logger.info(`🚀 ${env.APP_NAME} running on port ${env.PORT}`);
      logger.info(`📍 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 API: ${env.APP_URL}${env.API_PREFIX}`);
      logger.info(`❤️  Health: ${env.APP_URL}${env.API_PREFIX}/health`);
      logger.info(`🔌 Socket.IO: ${env.APP_URL}/socket.io`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      httpServer.close(async () => {
        await disconnectDatabase();
        logger.info("Server closed");
        process.exit(0);
      });

      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10_000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    process.on("unhandledRejection", (reason) => {
      logger.error("Unhandled Rejection", { reason });
    });

    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception", {
        message: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });
  } catch (error) {
    logger.error("Failed to start server", { error });
    process.exit(1);
  }
}

bootstrap();
