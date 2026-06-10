/**
 * Rate Limit Middleware — IP-based request throttling
 *
 * Limits each IP address to 20 requests per minute across all endpoints.
 * Returns a JSON error response matching the API error contract.
 *
 * @module middleware/rateLimit.middleware
 */

import rateLimit from "express-rate-limit";
import {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
} from "../constants.js";
import { ErrorCode } from "../types/index.js";
import type { ApiErrorResponse } from "../types/index.js";
import type { Request, Response } from "express";

/**
 * Express rate limiter: 20 requests per minute per IP.
 * Returns a standardised error response on limit exceeded.
 */
export const rateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    const errorResponse: ApiErrorResponse = {
      error: true,
      code: ErrorCode.RATE_LIMITED,
      message:
        "Too many requests. Please wait a moment and try again.",
      request_id: "",
    };

    res.status(429).json(errorResponse);
  },
});
