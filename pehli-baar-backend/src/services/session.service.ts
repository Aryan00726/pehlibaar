/**
 * Session Service — Redis-backed session storage
 *
 * Manages per-user session state including document context, simplified text,
 * language preference, and conversation history. Sessions expire after a
 * configurable TTL (default 2 hours).
 *
 * @module services/session.service
 */

import Redis from "ioredis";
import type { SessionData, ConversationTurn } from "../types/index.js";
import {
  SESSION_KEY_PREFIX,
  SESSION_TTL_SECONDS,
  MAX_CONVERSATION_TURNS,
} from "../constants.js";
import { telemetry } from "../config/azure.js";

let redis: Redis | null = null;
let useMemoryFallback = false;
const memoryStore = new Map<string, { data: string; expiresAt: number }>();

/**
 * Initialises the Redis client. Called once at startup.
 * Uses the REDIS_URL environment variable (default: redis://localhost:6379).
 */
export function initRedis(): Redis | null {
  if (process.env["SIMULATION_MODE"] === "true") {
    process.stderr.write("⚠️  [SIMULATION] Redis bypassed. Using in-memory session store.\n");
    useMemoryFallback = true;
    return null;
  }

  const redisUrl = process.env["REDIS_URL"] ?? "redis://localhost:6379";

  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      retryStrategy(times) {
        if (times > 2) {
          process.stderr.write("⚠️  Redis unreachable. Falling back to in-memory session store.\n");
          useMemoryFallback = true;
          return null; // Stop retrying
        }
        return 500;
      },
      lazyConnect: true,
    });

    redis.on("error", (err) => {
      if (!useMemoryFallback) {
        process.stderr.write(`⚠️  Redis error: ${err.message}. Falling back to in-memory session store.\n`);
        useMemoryFallback = true;
      }
      if (telemetry) {
        telemetry.trackException({ exception: err });
      }
    });

    // Try background connect
    redis.connect().catch((err) => {
      process.stderr.write(`⚠️  Redis connection failed: ${err.message}. Using in-memory session store.\n`);
      useMemoryFallback = true;
    });

    return redis;
  } catch (err) {
    process.stderr.write(`⚠️  Failed to initialize Redis: ${err instanceof Error ? err.message : String(err)}. Using in-memory session store.\n`);
    useMemoryFallback = true;
    return null;
  }
}

/**
 * Returns the active Redis client instance.
 * @throws if Redis has not been initialised and memory fallback is not active
 */
function getRedis(): Redis | null {
  if (useMemoryFallback) return null;
  return redis;
}

/**
 * Builds the Redis key for a given session ID.
 * @param sessionId - the UUID session identifier
 */
function sessionKey(sessionId: string): string {
  return `${SESSION_KEY_PREFIX}${sessionId}`;
}

/**
 * Creates a new session in Redis with the given data.
 * Sets the TTL to SESSION_TTL_SECONDS (default 2 hours).
 *
 * @param sessionId - the UUID session identifier
 * @param data - the session data to store
 */
export async function createSession(
  sessionId: string,
  data: SessionData
): Promise<void> {
  const key = sessionKey(sessionId);
  const jsonStr = JSON.stringify(data);

  const client = getRedis();
  if (!client) {
    const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
    memoryStore.set(key, { data: jsonStr, expiresAt });
    return;
  }

  try {
    await client.setex(key, SESSION_TTL_SECONDS, jsonStr);
  } catch (err) {
    useMemoryFallback = true;
    const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
    memoryStore.set(key, { data: jsonStr, expiresAt });
  }
}

/**
 * Retrieves a session from Redis by session ID.
 * Returns null if the session has expired or does not exist.
 *
 * @param sessionId - the UUID session identifier
 * @returns the session data, or null if not found/expired
 */
export async function getSession(
  sessionId: string
): Promise<SessionData | null> {
  const key = sessionKey(sessionId);
  const client = getRedis();

  if (!client) {
    const record = memoryStore.get(key);
    if (!record) return null;
    if (Date.now() > record.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return JSON.parse(record.data) as SessionData;
  }

  try {
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as SessionData;
  } catch (err) {
    useMemoryFallback = true;
    const record = memoryStore.get(key);
    if (!record) return null;
    if (Date.now() > record.expiresAt) {
      memoryStore.delete(key);
      return null;
    }
    return JSON.parse(record.data) as SessionData;
  }
}

/**
 * Updates an existing session with new data and refreshes the TTL.
 *
 * @param sessionId - the UUID session identifier
 * @param data - the updated session data
 */
export async function updateSession(
  sessionId: string,
  data: SessionData
): Promise<void> {
  await createSession(sessionId, data);
}

/**
 * Appends a conversation turn to the session's conversation history.
 * Trims to the most recent MAX_CONVERSATION_TURNS turns to bound memory.
 * Refreshes the session TTL.
 *
 * @param sessionId - the UUID session identifier
 * @param turn - the conversation turn to append (user or assistant message)
 * @returns the updated session data, or null if the session has expired
 */
export async function appendConversationTurn(
  sessionId: string,
  turn: ConversationTurn
): Promise<SessionData | null> {
  const session = await getSession(sessionId);
  if (!session) {
    return null;
  }

  session.conversationHistory.push(turn);

  // Trim to last N turns (keep pairs intact where possible)
  if (session.conversationHistory.length > MAX_CONVERSATION_TURNS * 2) {
    session.conversationHistory = session.conversationHistory.slice(
      -MAX_CONVERSATION_TURNS * 2
    );
  }

  await updateSession(sessionId, session);
  return session;
}

/**
 * Gracefully disconnects the Redis client.
 * Called during server shutdown.
 */
export async function disconnectRedis(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
    } catch {}
    redis = null;
  }
}
