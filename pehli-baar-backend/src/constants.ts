/**
 * Pehli Baar Backend — Application Constants
 *
 * All magic strings, numeric limits, and configuration values.
 * Nothing is hardcoded inline in service or route files.
 */

// ── Azure Document Intelligence ─────────────────────────
export const DOC_INTEL_MODEL_ID = "prebuilt-layout";

// ── Azure OpenAI ────────────────────────────────────────
export const OPENAI_DEPLOYMENT_NAME =
  process.env["OPENAI_DEPLOYMENT_NAME"] ?? "gpt-4o";
export const OPENAI_MAX_TOKENS_DECODE = 1000;
export const OPENAI_MAX_TOKENS_CHAT = 400;
export const OPENAI_TEMPERATURE = 0.3;
export const OPENAI_API_VERSION = "2024-06-01";

// ── Azure Blob Storage Container Names ──────────────────
export const BLOB_CONTAINER_UPLOADS =
  process.env["STORAGE_CONTAINER_UPLOADS"] ?? "uploads";
export const BLOB_CONTAINER_AUDIO =
  process.env["STORAGE_CONTAINER_AUDIO"] ?? "audio";

// ── Azure Key Vault Secret Names ────────────────────────
export const KV_SECRET_DOC_INTEL_KEY = "DOC-INTEL-KEY";
export const KV_SECRET_OPENAI_KEY = "OPENAI-KEY";
export const KV_SECRET_STORAGE_CONN = "STORAGE-CONNECTION-STRING";
export const KV_SECRET_SPEECH_KEY = "SPEECH-KEY";

// ── Session / Redis ─────────────────────────────────────
export const SESSION_KEY_PREFIX = "session:";
export const SESSION_TTL_HOURS = parseInt(
  process.env["SESSION_TTL_HOURS"] ?? "2",
  10
);
export const SESSION_TTL_SECONDS = SESSION_TTL_HOURS * 3600;
export const MAX_CONVERSATION_TURNS = 10;

// ── File Upload Limits ──────────────────────────────────
export const MAX_FILE_SIZE_MB = parseInt(
  process.env["MAX_FILE_SIZE_MB"] ?? "10",
  10
);
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// ── Image Preprocessing ─────────────────────────────────
export const IMAGE_MAX_DIMENSION = 2048;
export const IMAGE_JPEG_QUALITY = 85;

// ── Timeouts ────────────────────────────────────────────
/** Maximum wait time for any Azure service call (ms) */
export const UPSTREAM_TIMEOUT_MS = 30_000;

// ── Blob SAS Token Expiry ───────────────────────────────
/** Upload blobs expire after 1 hour */
export const UPLOAD_BLOB_TTL_HOURS = 1;
/** Audio blobs expire after 2 hours */
export const AUDIO_BLOB_TTL_HOURS = 2;
export const AUDIO_BLOB_TTL_SECONDS = AUDIO_BLOB_TTL_HOURS * 3600;

// ── Rate Limiting ───────────────────────────────────────
export const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
export const RATE_LIMIT_MAX_REQUESTS = 20;

// ── SSE Event Names ─────────────────────────────────────
export const SSE_EVENT_STAGE = "stage";
export const SSE_STAGE_EXTRACTING = "extracting";
export const SSE_STAGE_SIMPLIFYING = "simplifying";
export const SSE_STAGE_DONE = "done";

// ── Allowed MIME Types ──────────────────────────────────
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

// ── TTS Audio Format ────────────────────────────────────
export const TTS_OUTPUT_FORMAT = "Audio16Khz32KBitRateMonoMp3";

// ── Server ──────────────────────────────────────────────
export const DEFAULT_PORT = 3001;
export const API_PREFIX = "/api";
