/**
 * Pehli Baar Backend — Shared TypeScript Interfaces and Enums
 *
 * All type definitions used across services, routes, and middleware.
 * No default exports — named exports only.
 */

import type { Request } from "express";

// ── Supported Languages ─────────────────────────────────

/** Union type of all supported language codes */
export type SupportedLanguage =
  | "hi"
  | "ta"
  | "bn"
  | "mr"
  | "te"
  | "kn"
  | "ml"
  | "gu"
  | "pa"
  | "en";

// ── Error Handling ──────────────────────────────────────

/** Enumeration of all API error codes */
export enum ErrorCode {
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",
  DOCUMENT_UNREADABLE = "DOCUMENT_UNREADABLE",
  LANGUAGE_NOT_SUPPORTED = "LANGUAGE_NOT_SUPPORTED",
  UPSTREAM_TIMEOUT = "UPSTREAM_TIMEOUT",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  INVALID_REQUEST = "INVALID_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  RATE_LIMITED = "RATE_LIMITED",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

/** Map error codes to their HTTP status codes */
export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.FILE_TOO_LARGE]: 413,
  [ErrorCode.UNSUPPORTED_FORMAT]: 415,
  [ErrorCode.DOCUMENT_UNREADABLE]: 422,
  [ErrorCode.LANGUAGE_NOT_SUPPORTED]: 400,
  [ErrorCode.UPSTREAM_TIMEOUT]: 504,
  [ErrorCode.SESSION_EXPIRED]: 410,
  [ErrorCode.INVALID_REQUEST]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
};

/**
 * Custom application error with structured error code and HTTP status.
 * Used throughout the app and caught by the central error handler.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly requestId: string;

  constructor(code: ErrorCode, message: string, requestId?: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = ERROR_STATUS_MAP[code];
    this.requestId = requestId ?? "";
  }
}

// ── Conversation & Session ──────────────────────────────

/** A single turn in the conversation history */
export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

/** Session data stored in Redis for each document interaction */
export interface SessionData {
  sessionId: string;
  documentContext: string;
  simplifiedText: string;
  language: SupportedLanguage;
  conversationHistory: ConversationTurn[];
  createdAt: string;
}

// ── Simplification Result ───────────────────────────────

/** Amount extracted from a document (fee, stipend, fine) */
export interface ExtractedAmount {
  label: string;
  value: string;
}

/**
 * JSON schema returned by GPT-4o during document simplification.
 * Matches the output schema defined in the simplification system prompt.
 */
export interface SimplificationResult {
  simplified_text: string;
  key_actions: string[];
  deadline_dates: string[];
  amounts: ExtractedAmount[];
  follow_up_suggestions: string[];
}

/** Error response from GPT-4o when the document is unreadable */
export interface SimplificationError {
  error: "DOCUMENT_UNREADABLE";
  message: string;
}

// ── API Request/Response Types ──────────────────────────

/** Express Request with multer file attached */
export interface DecodeRequestBody {
  language?: string;
  sessionId?: string;
}

export interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

/** Success response for POST /api/decode */
export interface DecodeResponse {
  sessionId: string;
  language: SupportedLanguage;
  simplified_text: string;
  key_actions: string[];
  deadline_dates: string[];
  amounts?: ExtractedAmount[];
  follow_up_suggestions: string[];
  audio_available: boolean;
  processing_time_ms: number;
}

/** Request body for POST /api/chat */
export interface ChatRequestBody {
  sessionId: string;
  message: string;
  language?: string;
}

/** Success response for POST /api/chat */
export interface ChatResponse {
  sessionId: string;
  reply: string;
  language: SupportedLanguage;
  turn: number;
}

/** Request body for POST /api/speak */
export interface SpeakRequestBody {
  text: string;
  language: string;
  sessionId?: string;
}

/** Success response for POST /api/speak */
export interface SpeakResponse {
  audio_url: string;
  expires_in_seconds: number;
  voice_name: string;
}

/** Standard API error response */
export interface ApiErrorResponse {
  error: true;
  code: ErrorCode;
  message: string;
  request_id: string;
}

// ── SSE Event Types ─────────────────────────────────────

/** Server-Sent Event stage names emitted during /api/decode */
export type SSEStage = "extracting" | "simplifying" | "done";

/** SSE event payload for progress stages */
export interface SSEStageEvent {
  event: "stage";
  data: SSEStage | DecodeResponse;
}

// ── Authentication Types ────────────────────────────────

/** Decoded User Info payload from JWT auth */
export interface AuthUser {
  name: string;
  email?: string;
  phone?: string;
}

/** Express Request extended with verified user credentials */
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

