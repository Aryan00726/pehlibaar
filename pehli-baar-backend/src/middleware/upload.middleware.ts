/**
 * Upload Middleware — multer configuration for file uploads
 *
 * Configures multer with memory storage, file size limits, and
 * MIME type validation for document uploads.
 *
 * @module middleware/upload.middleware
 */

import multer from "multer";
import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from "../constants.js";
import { AppError, ErrorCode } from "../types/index.js";
import type { Request } from "express";

/**
 * File filter that validates uploaded files against allowed MIME types.
 * Rejects files that are not JPEG, PNG, WebP, or PDF.
 */
const fileFilter: multer.Options["fileFilter"] = (
  _req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  const allowedTypes: readonly string[] = ALLOWED_MIME_TYPES;

  if (allowedTypes.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new AppError(
        ErrorCode.UNSUPPORTED_FORMAT,
        `Unsupported file format: ${file.mimetype}. Please upload a JPEG, PNG, WebP image, or PDF.`
      )
    );
  }
};

/**
 * Pre-configured multer instance for document uploads.
 *
 * - Storage: memory (buffer in req.file.buffer)
 * - Max file size: 10MB (configurable via MAX_FILE_SIZE_MB env var)
 * - Allowed types: image/jpeg, image/png, image/webp, application/pdf
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter,
});

/**
 * Single-file upload middleware for the "file" field.
 * Attaches the uploaded file to `req.file`.
 */
export const uploadSingle = upload.single("file");
