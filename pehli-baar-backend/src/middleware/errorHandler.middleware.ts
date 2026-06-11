/**
 * Error Handler Middleware — Central error handling
 *
 * Catches all errors thrown in route handlers and middleware,
 * maps them to standardised API error responses, and logs them
 * to Azure Application Insights. Never leaks internal error details.
 *
 * @module middleware/errorHandler.middleware
 */

import type { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { AppError, ErrorCode, ERROR_STATUS_MAP } from "../types/index.js";
import type { ApiErrorResponse } from "../types/index.js";
import { telemetry } from "../config/azure.js";
import multer from "multer";

/**
 * Central Express error handler.
 * Must be mounted LAST in the middleware chain (4-arg signature).
 *
 * - AppError instances: uses their code and message
 * - Multer errors: maps to FILE_TOO_LARGE or UNSUPPORTED_FORMAT
 * - Unknown errors: logs to App Insights, returns INTERNAL_ERROR
 *
 * Never leaks Azure SDK error messages, stack traces, or internal details
 * to the client response.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = uuidv4();

  // Handle known AppErrors
  if (err instanceof AppError) {
    const response: ApiErrorResponse = {
      error: true,
      code: err.code,
      message: err.message,
      request_id: err.requestId || requestId,
    };

    // Log to App Insights (but never log document content)
    if (telemetry) {
      telemetry.trackException({
        exception: err,
        properties: {
          code: err.code,
          requestId,
          path: req.path,
          method: req.method,
        },
      });
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Multer errors
  if (err instanceof multer.MulterError) {
    let code: ErrorCode;
    let message: string;
    let statusCode: number;

    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        code = ErrorCode.FILE_TOO_LARGE;
        message = "File is too large. Maximum size is 10 MB.";
        statusCode = ERROR_STATUS_MAP[ErrorCode.FILE_TOO_LARGE];
        break;
      case "LIMIT_FILE_COUNT":
        code = ErrorCode.INVALID_REQUEST;
        message = "Only one file can be uploaded at a time.";
        statusCode = ERROR_STATUS_MAP[ErrorCode.INVALID_REQUEST];
        break;
      case "LIMIT_UNEXPECTED_FILE":
        code = ErrorCode.INVALID_REQUEST;
        message =
          'Unexpected file field. Please upload using the "file" field.';
        statusCode = ERROR_STATUS_MAP[ErrorCode.INVALID_REQUEST];
        break;
      default:
        code = ErrorCode.INTERNAL_ERROR;
        message = "File upload failed. Please try again.";
        statusCode = ERROR_STATUS_MAP[ErrorCode.INTERNAL_ERROR];
    }

    const response: ApiErrorResponse = {
      error: true,
      code,
      message,
      request_id: requestId,
    };

    res.status(statusCode).json(response);
    return;
  }

  // Handle unknown errors — NEVER leak internal details
  console.error("Unknown Error:", err);
  if (telemetry) {
    telemetry.trackException({
      exception: err,
      properties: {
        requestId,
        path: req.path,
        method: req.method,
        // Do NOT log req.body — it may contain document text (PII)
      },
    });
  }

  const response: ApiErrorResponse = {
    error: true,
    code: ErrorCode.INTERNAL_ERROR,
    message: "An unexpected error occurred. Please try again later.",
    request_id: requestId,
  };

  res.status(500).json(response);
}
