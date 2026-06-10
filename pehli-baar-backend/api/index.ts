/**
 * Vercel Serverless Entry Point
 *
 * Wraps the Express app for Vercel's serverless runtime.
 * All /api/* routes are handled by this single function.
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { initClients } from "../src/config/azure.js";
import { initRedis } from "../src/services/session.service.js";
import { authMiddleware } from "../src/middleware/auth.middleware.js";
import { rateLimiter } from "../src/middleware/rateLimit.middleware.js";
import { errorHandler } from "../src/middleware/errorHandler.middleware.js";
import { decodeRouter } from "../src/routes/decode.route.js";
import { chatRouter } from "../src/routes/chat.route.js";
import { speakRouter } from "../src/routes/speak.route.js";
import { authRouter } from "../src/routes/auth.route.js";

const app = express();

// ── Global Middleware ───────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "x-api-key", "Authorization"],
  })
);
app.use(express.json({ limit: "1mb" }));

// ── Route Registration ─────────────────────────────────
// Public auth routes
app.use("/api/auth", authRouter);

// Protected routes
app.use("/api", authMiddleware);
app.use("/api", rateLimiter);
app.use("/api/decode", decodeRouter);
app.use("/api/chat", chatRouter);
app.use("/api/speak", speakRouter);

// Error handler
app.use(errorHandler);

// ── Initialisation ─────────────────────────────────────
let initialized = false;

async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  initRedis();
  try {
    await initClients();
  } catch (err) {
    // Azure clients may not be available on Vercel — that's OK.
    // Auth routes and simulation mode don't need them.
    console.warn("Azure client init skipped:", err instanceof Error ? err.message : err);
  }
  initialized = true;
}

// Wrap with initialization
const handler = async (req: any, res: any) => {
  await ensureInitialized();
  return app(req, res);
};

export default handler;
