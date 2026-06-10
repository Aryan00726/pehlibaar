/**
 * Decode Route — POST /api/decode
 *
 * Full document processing pipeline with Server-Sent Events (SSE) streaming.
 * Accepts a document upload (image or PDF), extracts text, simplifies it
 * using GPT-4o, and returns the result with progress events.
 *
 * Pipeline: preprocess → blob upload → Doc Intel → sanitise → GPT-4o → session store → response
 *
 * @module routes/decode.route
 */

import { Router } from "express";
import type { Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { uploadSingle } from "../middleware/upload.middleware.js";
import { preprocessImage } from "../utils/imagePreprocess.js";
import { sanitiseText, hasReadableContent } from "../utils/sanitise.js";
import { isSupportedLanguage } from "../utils/languageMap.js";
import { extractText } from "../services/documentIntel.service.js";
import { simplifyDocument } from "../services/simplify.service.js";
import { createSession } from "../services/session.service.js";
import { getBlobServiceClient } from "../config/azure.js";
import { telemetry } from "../config/azure.js";
import {
  BLOB_CONTAINER_UPLOADS,
  SSE_EVENT_STAGE,
  SSE_STAGE_EXTRACTING,
  SSE_STAGE_SIMPLIFYING,
  SSE_STAGE_DONE,
} from "../constants.js";
import {
  AppError,
  ErrorCode,
  type MulterRequest,
  type DecodeResponse,
  type SupportedLanguage,
  type SessionData,
} from "../types/index.js";

export const decodeRouter = Router();

/**
 * Sends an SSE event to the client.
 * Format: `event: stage\ndata: <payload>\n\n`
 */
function sendSSE(res: Response, event: string, data: string | object): void {
  const payload = typeof data === "object" ? JSON.stringify(data) : data;
  res.write(`event: ${event}\ndata: ${payload}\n\n`);
}

/**
 * Uploads a file buffer to Azure Blob Storage (uploads container).
 * Returns the blob URL for use with Document Intelligence.
 *
 * @param buffer - the file buffer to upload
 * @param mimeType - the MIME type of the file
 * @returns the blob URL
 */
async function uploadToBlob(
  buffer: Buffer,
  mimeType: string
): Promise<{ blobUrl: string; blobName: string }> {
  const blobService = getBlobServiceClient();
  const containerClient = blobService.getContainerClient(
    BLOB_CONTAINER_UPLOADS
  );

  await containerClient.createIfNotExists();

  const extension = mimeType === "application/pdf" ? "pdf" : "jpg";
  const blobName = `${uuidv4()}.${extension}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: mimeType,
    },
  });

  return { blobUrl: blockBlobClient.url, blobName };
}

/**
 * Deletes a blob from the uploads container after processing.
 * Silently ignores errors (best-effort cleanup).
 */
async function deleteBlob(blobName: string): Promise<void> {
  try {
    const blobService = getBlobServiceClient();
    const containerClient = blobService.getContainerClient(
      BLOB_CONTAINER_UPLOADS
    );
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
  } catch (err) {
    // Best-effort cleanup — don't fail the request
    if (telemetry) {
      telemetry.trackTrace({
        message: `Failed to delete upload blob: ${blobName}`,
      });
    }
  }
}

/**
 * POST /api/decode
 *
 * Accepts multipart/form-data with:
 * - file (required): image or PDF document
 * - language (optional): target language code (default: "hi")
 * - sessionId (optional): existing session UUID (generates one if absent)
 *
 * Responds with SSE events showing pipeline progress, ending with the
 * full decode response payload.
 */
decodeRouter.post(
  "/",
  (req: MulterRequest, res: Response, next: NextFunction) => {
    uploadSingle(req, res, (err) => {
      if (err) {
        next(err);
        return;
      }
      handleDecode(req, res, next).catch(next);
    });
  }
);

async function handleDecode(
  req: MulterRequest,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const startTime = Date.now();

  // Validate file presence
  if (!req.file) {
    throw new AppError(
      ErrorCode.INVALID_REQUEST,
      "No file uploaded. Please attach a document image or PDF."
    );
  }

  // Validate language
  const languageParam = (req.body as Record<string, unknown>)["language"];
  const language: SupportedLanguage =
    typeof languageParam === "string" && isSupportedLanguage(languageParam)
      ? languageParam
      : "hi";

  if (
    typeof languageParam === "string" &&
    languageParam.length > 0 &&
    !isSupportedLanguage(languageParam)
  ) {
    throw new AppError(
      ErrorCode.LANGUAGE_NOT_SUPPORTED,
      `Language "${languageParam}" is not supported. Supported: hi, ta, bn, mr, te, kn, ml, gu, pa, en`
    );
  }

  // Session ID
  const sessionIdParam = (req.body as Record<string, unknown>)["sessionId"];
  const sessionId =
    typeof sessionIdParam === "string" && sessionIdParam.length > 0
      ? sessionIdParam
      : uuidv4();

  // Set up SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  let uploadedBlobName = "";

  try {
    if (process.env["SIMULATION_MODE"] === "true") {
      // ── Step 3: Extract text ───
      sendSSE(res, SSE_EVENT_STAGE, SSE_STAGE_EXTRACTING);
      const rawText = await extractText(req.file.buffer, req.file.mimetype, req.file.originalname);

      // ── Step 5: Simplify ───
      sendSSE(res, SSE_EVENT_STAGE, SSE_STAGE_SIMPLIFYING);
      const simplificationResult = await simplifyDocument(rawText, language);

      // ── Step 6: Store session ─────────────────────────────
      const sessionData: SessionData = {
        sessionId,
        documentContext: rawText,
        simplifiedText: simplificationResult.simplified_text,
        language,
        conversationHistory: [],
        createdAt: new Date().toISOString(),
      };

      await createSession(sessionId, sessionData);

      // ── Step 7: Build and send response ───────────────────
      const processingTimeMs = Date.now() - startTime;

      const response: DecodeResponse = {
        sessionId,
        language,
        simplified_text: simplificationResult.simplified_text,
        key_actions: simplificationResult.key_actions,
        deadline_dates: simplificationResult.deadline_dates,
        amounts: simplificationResult.amounts ?? [],
        follow_up_suggestions: simplificationResult.follow_up_suggestions,
        audio_available: true,
        processing_time_ms: processingTimeMs,
      };

      sendSSE(res, SSE_EVENT_STAGE, {
        stage: SSE_STAGE_DONE,
        ...response,
      });

      res.end();
      return;
    }

    // ── Step 1: Preprocess Image ──────────────────────────
    const { buffer: processedBuffer, mimeType: processedMimeType } =
      await preprocessImage(req.file.buffer, req.file.mimetype);

    // ── Step 2: Upload to Blob Storage ────────────────────
    const { blobName } = await uploadToBlob(
      processedBuffer,
      processedMimeType
    );
    uploadedBlobName = blobName;

    // ── Step 3: Extract text with Document Intelligence ───
    sendSSE(res, SSE_EVENT_STAGE, SSE_STAGE_EXTRACTING);

    const rawText = await extractText(processedBuffer, processedMimeType, req.file.originalname);

    // Delete the uploaded blob immediately after extraction
    void deleteBlob(uploadedBlobName);

    // Check if extracted text has readable content
    if (!hasReadableContent(rawText)) {
      throw new AppError(
        ErrorCode.DOCUMENT_UNREADABLE,
        "The document does not contain enough readable text. Please try a clearer photo."
      );
    }

    // ── Step 4: Sanitise PII ──────────────────────────────
    const sanitisedText = sanitiseText(rawText);

    // ── Step 5: Simplify with GPT-4o ──────────────────────
    sendSSE(res, SSE_EVENT_STAGE, SSE_STAGE_SIMPLIFYING);

    const simplificationResult = await simplifyDocument(
      sanitisedText,
      language
    );

    // ── Step 6: Store session ─────────────────────────────
    const sessionData: SessionData = {
      sessionId,
      documentContext: sanitisedText,
      simplifiedText: simplificationResult.simplified_text,
      language,
      conversationHistory: [],
      createdAt: new Date().toISOString(),
    };

    await createSession(sessionId, sessionData);

    // ── Step 7: Build and send response ───────────────────
    const processingTimeMs = Date.now() - startTime;

    const response: DecodeResponse = {
      sessionId,
      language,
      simplified_text: simplificationResult.simplified_text,
      key_actions: simplificationResult.key_actions,
      deadline_dates: simplificationResult.deadline_dates,
      amounts: simplificationResult.amounts,
      follow_up_suggestions: simplificationResult.follow_up_suggestions,
      audio_available: true,
      processing_time_ms: processingTimeMs,
    };

    sendSSE(res, SSE_EVENT_STAGE, {
      stage: SSE_STAGE_DONE,
      ...response,
    });

    res.end();
  } catch (err) {
    // Clean up uploaded blob on error
    if (uploadedBlobName) {
      void deleteBlob(uploadedBlobName);
    }

    // For SSE, we send the error as an SSE event then close
    if (err instanceof AppError) {
      sendSSE(res, "error", {
        error: true,
        code: err.code,
        message: err.message,
        request_id: err.requestId || uuidv4(),
      });
    } else {
      if (telemetry) {
        telemetry.trackException({
          exception: err instanceof Error ? err : new Error(String(err)),
        });
      }
      sendSSE(res, "error", {
        error: true,
        code: ErrorCode.INTERNAL_ERROR,
        message: "An unexpected error occurred. Please try again.",
        request_id: uuidv4(),
      });
    }

    res.end();
  }
}
