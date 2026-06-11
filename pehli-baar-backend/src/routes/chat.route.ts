/**
 * Chat Route — POST /api/chat
 *
 * Follow-up Q&A endpoint. Takes a session ID, user message, and language,
 * retrieves the document context from Redis, and returns a contextual
 * response from GPT-4o.
 *
 * @module routes/chat.route
 */

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { getSession, appendConversationTurn } from "../services/session.service.js";
import { chatWithDocument } from "../services/gemini.service.js";
import { isSupportedLanguage } from "../utils/languageMap.js";
import {
  AppError,
  ErrorCode,
  type ChatRequestBody,
  type ChatResponse,
  type SupportedLanguage,
} from "../types/index.js";

export const chatRouter = Router();

/**
 * POST /api/chat
 *
 * Accepts JSON body:
 * - sessionId (required): UUID from a previous /api/decode call
 * - message (required): the student's follow-up question
 * - language (optional): language code override (defaults to session language)
 *
 * Returns a contextual reply grounded in the original document.
 */
chatRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as ChatRequestBody;

      // Validate required fields
      if (!body.sessionId || typeof body.sessionId !== "string") {
        throw new AppError(
          ErrorCode.INVALID_REQUEST,
          "sessionId is required and must be a string."
        );
      }

      if (!body.message || typeof body.message !== "string" || body.message.trim().length === 0) {
        throw new AppError(
          ErrorCode.INVALID_REQUEST,
          "message is required and must be a non-empty string."
        );
      }

      // Validate language if provided
      const languageOverride = body.language;
      if (
        typeof languageOverride === "string" &&
        languageOverride.length > 0 &&
        !isSupportedLanguage(languageOverride)
      ) {
        throw new AppError(
          ErrorCode.LANGUAGE_NOT_SUPPORTED,
          `Language "${languageOverride}" is not supported.`
        );
      }

      // Retrieve session
      const session = await getSession(body.sessionId);

      if (!session) {
        throw new AppError(
          ErrorCode.SESSION_EXPIRED,
          "Session has expired or was not found. Please upload the document again."
        );
      }

      // Determine language (use override or session default)
      const language: SupportedLanguage =
        typeof languageOverride === "string" && isSupportedLanguage(languageOverride)
          ? languageOverride
          : session.language;

      // Append user message to conversation history
      await appendConversationTurn(body.sessionId, {
        role: "user",
        content: body.message.trim(),
      });

      // Build document context (combine extracted and simplified text)
      const documentContext = `Original Document:\n${session.documentContext}\n\nSimplified Explanation:\n${session.simplifiedText}`;

      // Get AI reply via Gemini
      const reply = await chatWithDocument(
        documentContext,
        session.conversationHistory,
        body.message.trim(),
        language
      );

      // Append assistant reply to history
      const updatedSession = await appendConversationTurn(body.sessionId, {
        role: "assistant",
        content: reply,
      });

      // Calculate turn number
      const turnCount = updatedSession
        ? Math.floor(updatedSession.conversationHistory.length / 2)
        : 1;

      const response: ChatResponse = {
        sessionId: body.sessionId,
        reply,
        language,
        turn: turnCount,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);
