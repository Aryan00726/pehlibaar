/**
 * Speak Route — POST /api/speak
 *
 * Text-to-speech endpoint. Takes text and a language code, synthesises
 * audio using Azure Neural TTS, and returns a time-limited URL to the
 * MP3 file.
 *
 * @module routes/speak.route
 */

import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { synthesiseAndUpload } from "../services/tts.service.js";
import { isSupportedLanguage, LANGUAGE_VOICE_MAP } from "../utils/languageMap.js";
import {
  AppError,
  ErrorCode,
  type SpeakRequestBody,
  type SpeakResponse,
  type SupportedLanguage,
} from "../types/index.js";

export const speakRouter = Router();

/**
 * POST /api/speak
 *
 * Accepts JSON body:
 * - text (required): the text to synthesise as audio
 * - language (required): language code determining the neural voice
 * - sessionId (optional): for logging/tracking purposes
 *
 * Returns a SAS URL to the generated MP3 audio file.
 */
speakRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as SpeakRequestBody;

      // Validate required fields
      if (!body.text || typeof body.text !== "string" || body.text.trim().length === 0) {
        throw new AppError(
          ErrorCode.INVALID_REQUEST,
          "text is required and must be a non-empty string."
        );
      }

      if (!body.language || typeof body.language !== "string") {
        throw new AppError(
          ErrorCode.INVALID_REQUEST,
          "language is required and must be a string."
        );
      }

      if (!isSupportedLanguage(body.language)) {
        throw new AppError(
          ErrorCode.LANGUAGE_NOT_SUPPORTED,
          `Language "${body.language}" is not supported for speech synthesis.`
        );
      }

      const language: SupportedLanguage = body.language;

      // Synthesise and upload
      const { audioUrl, expiresInSeconds, voiceName } =
        await synthesiseAndUpload(body.text.trim(), language);

      const response: SpeakResponse = {
        audio_url: audioUrl,
        expires_in_seconds: expiresInSeconds,
        voice_name: voiceName,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
);
