/**
 * Support Chat Route — POST /api/support-chat
 *
 * General stateless Q&A endpoint. Takes a user message, language, and
 * full conversation history, and returns a response from Gemini.
 *
 * @module routes/supportChat.route
 */

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { generalSupportChat } from "../services/gemini.service.js";
import { isSupportedLanguage } from "../utils/languageMap.js";
import { AppError, ErrorCode, type SupportedLanguage } from "../types/index.js";

export const supportChatRouter = Router();

interface SupportChatRequestBody {
  message: string;
  history: Array<{ role: string; content: string }>;
  language?: string;
}

/**
 * POST /api/support-chat
 *
 * Accepts JSON body:
 * - message (required): the student's question
 * - history (required): array of previous messages in the session
 * - language (optional): preferred language (defaults to "hi")
 */
supportChatRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as SupportChatRequestBody;

      // Validate required fields
      if (!body.message || typeof body.message !== "string" || body.message.trim().length === 0) {
        throw new AppError(
          ErrorCode.INVALID_REQUEST,
          "message is required and must be a non-empty string."
        );
      }

      if (!Array.isArray(body.history)) {
        throw new AppError(
          ErrorCode.INVALID_REQUEST,
          "history must be an array of conversation turns."
        );
      }

      // Validate language if provided
      const language: SupportedLanguage =
        typeof body.language === "string" && isSupportedLanguage(body.language)
          ? body.language
          : "hi";

      // Call Gemini for general support response
      const reply = await generalSupportChat(
        body.history,
        body.message.trim(),
        language
      );

      res.status(200).json({
        success: true,
        reply,
        language,
      });
    } catch (err) {
      next(err);
    }
  }
);
