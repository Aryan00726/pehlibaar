/**
 * Scan Document Route — POST /api/scan-document
 *
 * Accepts a document upload (image or PDF), sends it to Google Gemini
 * for AI-powered analysis, and returns structured results.
 *
 * Pipeline: upload → base64 encode → Gemini Vision → parse JSON → session store → response
 *
 * @module routes/scanDocument.route
 */

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { uploadSingle } from "../middleware/upload.middleware.js";
import { analyzeDocument } from "../services/gemini.service.js";
import { createSession } from "../services/session.service.js";
import {
  AppError,
  ErrorCode,
  type MulterRequest,
  type SupportedLanguage,
  type SessionData,
} from "../types/index.js";
import { isSupportedLanguage } from "../utils/languageMap.js";

export const scanDocumentRouter = Router();

/**
 * POST /api/scan-document
 *
 * Accepts multipart/form-data with:
 * - file (required): image or PDF document
 * - language (optional): target language code (default: "hi")
 *
 * Returns JSON with structured document analysis from Gemini.
 */
scanDocumentRouter.post(
  "/",
  (req: MulterRequest, res: Response, next: NextFunction) => {
    uploadSingle(req, res, (err) => {
      if (err) {
        next(err);
        return;
      }
      handleScanDocument(req, res, next).catch(next);
    });
  }
);

async function handleScanDocument(
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

  // Session ID
  const sessionId = uuidv4();

  try {
    // Convert file buffer to base64
    const base64Data = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype;

    // Call Gemini API for document analysis
    const result = await analyzeDocument(base64Data, mimeType);

    // Build document context string for chat follow-ups
    const documentContext = [
      `Most Important Point: ${result.mostImportantPoint}`,
      `Key Data: ${result.cards.map(c => `${c.label}: ${c.value}`).join(", ")}`,
      `Next Steps: ${result.nextSteps.join("; ")}`,
    ].join("\n\n");

    // Store session for chat follow-ups
    const sessionData: SessionData = {
      sessionId,
      documentContext,
      simplifiedText: result.mostImportantPoint,
      language,
      conversationHistory: [],
      createdAt: new Date().toISOString(),
    };

    await createSession(sessionId, sessionData);

    // Build response
    const processingTimeMs = Date.now() - startTime;

    res.status(200).json({
      sessionId,
      language,
      mostImportantPoint: result.mostImportantPoint,
      cards: result.cards,
      nextSteps: result.nextSteps,
      suggestedQuestions: result.suggestedQuestions,
      processing_time_ms: processingTimeMs,
    });
  } catch (err) {
    console.error("Gemini Scan Error:", err);
    // Handle Gemini-specific errors
    if (err instanceof Error && err.message.includes("GEMINI_API_KEY")) {
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        "AI service is not configured. Please add your Gemini API key."
      );
    }

    if (err instanceof Error && err.message.includes("Gemini API error")) {
      throw new AppError(
        ErrorCode.UPSTREAM_TIMEOUT,
        "AI service is temporarily unavailable. Please try again."
      );
    }

    throw err;
  }
}
