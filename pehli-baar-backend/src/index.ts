/**
 * Pehli Baar Backend — Application Entry Point
 *
 * Express server bootstrap: middleware mounting, route registration,
 * Azure client initialisation, and graceful shutdown handling.
 *
 * @module index
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { initClients, telemetry } from "./config/azure.js";
import { initRedis, disconnectRedis } from "./services/session.service.js";
import { authMiddleware } from "./middleware/auth.middleware.js";
import { rateLimiter } from "./middleware/rateLimit.middleware.js";
import { errorHandler } from "./middleware/errorHandler.middleware.js";
import { decodeRouter } from "./routes/decode.route.js";
import { chatRouter } from "./routes/chat.route.js";
import { speakRouter } from "./routes/speak.route.js";
import { authRouter } from "./routes/auth.route.js";
import { DEFAULT_PORT, API_PREFIX } from "./constants.js";

const app = express();
const port = parseInt(process.env["PORT"] ?? String(DEFAULT_PORT), 10);

// ── Global Middleware (order matters) ───────────────────

// Security headers
app.use(helmet());

// CORS — allow all origins in development, restrict in production
app.use(
  cors({
    origin: process.env["NODE_ENV"] === "production"
      ? process.env["ALLOWED_ORIGINS"]?.split(",") ?? []
      : true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "x-api-key", "Authorization"],
  })
);

// Parse JSON bodies (for /api/chat and /api/speak)
app.use(express.json({ limit: "1mb" }));

// Public routes
app.use(`${API_PREFIX}/auth`, authRouter);

// API key authentication
app.use(`${API_PREFIX}`, authMiddleware);

// Rate limiting
app.use(`${API_PREFIX}`, rateLimiter);

// ── Route Registration ──────────────────────────────────

app.use(`${API_PREFIX}/decode`, decodeRouter);
app.use(`${API_PREFIX}/chat`, chatRouter);
app.use(`${API_PREFIX}/speak`, speakRouter);

// ── Central Error Handler (must be last) ────────────────

app.use(errorHandler);

// ── Server Startup ──────────────────────────────────────

async function startServer(): Promise<void> {
  try {
    // Initialise Redis
    initRedis();

    // Initialise Azure clients (fetches secrets from Key Vault / .env)
    await initClients();

    app.listen(port, () => {
      if (telemetry) {
        telemetry.trackTrace({
          message: `Pehli Baar backend started on port ${port}`,
        });
      }
      // Startup log to stderr (not document content, safe to log)
      process.stderr.write(
        `\n🚀 Pehli Baar backend running at http://localhost:${port}\n` +
        `   Endpoints:\n` +
        `     POST ${API_PREFIX}/decode  — Document upload + simplification\n` +
        `     POST ${API_PREFIX}/chat    — Follow-up Q&A\n` +
        `     POST ${API_PREFIX}/speak   — Text-to-speech\n\n`
      );
    });
  } catch (err) {
    // Log startup failure
    if (telemetry) {
      telemetry.trackException({
        exception: err instanceof Error ? err : new Error(String(err)),
        properties: { phase: "startup" },
      });
    }
    process.stderr.write(
      `\n❌ Failed to start server: ${err instanceof Error ? err.message : String(err)}\n\n`
    );
    process.exit(1);
  }
}

// ── Graceful Shutdown ───────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  process.stderr.write(`\n${signal} received. Shutting down gracefully...\n`);
  await disconnectRedis();

  if (telemetry) {
    telemetry.flush();
  }

  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

// Start
void startServer();

export default app;
