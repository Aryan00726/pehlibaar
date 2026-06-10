/**
 * Azure Client Initialisation — Singleton Pattern
 *
 * All Azure SDK clients are initialised once at startup via `initClients()`.
 * In production, secrets are fetched from Azure Key Vault using Managed Identity.
 * In local development (no KEYVAULT_URI), secrets fall back to .env variables.
 *
 * @module config/azure
 */

import {
  DocumentAnalysisClient,
  AzureKeyCredential,
} from "@azure/ai-form-recognizer";
import { AzureOpenAI } from "openai";
import { BlobServiceClient } from "@azure/storage-blob";
import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";
import * as appInsights from "applicationinsights";
import {
  KV_SECRET_DOC_INTEL_KEY,
  KV_SECRET_OPENAI_KEY,
  KV_SECRET_STORAGE_CONN,
  KV_SECRET_SPEECH_KEY,
  OPENAI_API_VERSION,
} from "../constants.js";

// ── App Insights (initialise first) ─────────────────────

const appInsightsConnStr = process.env["APPINSIGHTS_CONNECTION_STRING"];

if (appInsightsConnStr) {
  appInsights
    .setup(appInsightsConnStr)
    .setAutoCollectRequests(true)
    .setAutoCollectExceptions(true)
    .setAutoCollectPerformance(true, true)
    .start();
}

/**
 * Application Insights telemetry client.
 * Use `telemetry.trackException()` for error logging — never `console.log`.
 */
export const telemetry = appInsights.defaultClient;

// ── Azure Client Singletons ─────────────────────────────

let _docIntelClient: DocumentAnalysisClient | null = null;
let _openAIClient: AzureOpenAI | null = null;
let _blobServiceClient: BlobServiceClient | null = null;
let _speechKey: string | null = null;

/**
 * Returns the Document Intelligence client.
 * @throws if `initClients()` has not been called
 */
export function getDocIntelClient(): DocumentAnalysisClient {
  if (!_docIntelClient) {
    throw new Error(
      "DocumentAnalysisClient not initialised. Call initClients() first."
    );
  }
  return _docIntelClient;
}

/**
 * Returns the Azure OpenAI client.
 * @throws if `initClients()` has not been called
 */
export function getOpenAIClient(): AzureOpenAI {
  if (!_openAIClient) {
    throw new Error("AzureOpenAI client not initialised. Call initClients() first.");
  }
  return _openAIClient;
}

/**
 * Returns the Blob Storage service client.
 * @throws if `initClients()` has not been called
 */
export function getBlobServiceClient(): BlobServiceClient {
  if (!_blobServiceClient) {
    throw new Error(
      "BlobServiceClient not initialised. Call initClients() first."
    );
  }
  return _blobServiceClient;
}

/**
 * Returns the Azure Speech API key.
 * @throws if `initClients()` has not been called
 */
export function getSpeechKey(): string {
  if (!_speechKey) {
    throw new Error("Speech key not initialised. Call initClients() first.");
  }
  return _speechKey;
}

/**
 * Fetches a secret value either from Azure Key Vault or from a .env fallback.
 *
 * @param keyVaultClient - optional Key Vault SecretClient (null if no KV URI)
 * @param secretName - the Key Vault secret name (e.g. "DOC-INTEL-KEY")
 * @param envFallback - the .env variable name to use as fallback
 * @returns the secret value string
 * @throws if the secret cannot be found in either source
 */
async function resolveSecret(
  keyVaultClient: SecretClient | null,
  secretName: string,
  envFallback: string
): Promise<string> {
  if (keyVaultClient) {
    try {
      const secret = await keyVaultClient.getSecret(secretName);
      if (secret.value) {
        return secret.value;
      }
    } catch (err) {
      // Fall through to env fallback
      if (telemetry) {
        telemetry.trackTrace({
          message: `Key Vault secret "${secretName}" not found, falling back to env var "${envFallback}"`,
        });
      }
    }
  }

  const envValue = process.env[envFallback];
  if (!envValue) {
    throw new Error(
      `Secret "${secretName}" not found in Key Vault and env var "${envFallback}" is not set.`
    );
  }
  return envValue;
}

/**
 * Initialises all Azure SDK clients. Must be called once at startup before
 * `app.listen()`. Fetches secrets from Key Vault (prod) or .env (local dev).
 *
 * @throws if any required secret or endpoint is missing
 */
export async function initClients(): Promise<void> {
  if (process.env["SIMULATION_MODE"] === "true") {
    process.stderr.write(
      `\n⚠️  [SIMULATION MODE] Running in simulation mode. Azure integrations are bypassed and mocked.\n\n`
    );
    _speechKey = "mock-speech-key";
    return;
  }

  // Determine if Key Vault is available
  const keyVaultUri = process.env["KEYVAULT_URI"];
  let keyVaultClient: SecretClient | null = null;

  if (keyVaultUri) {
    keyVaultClient = new SecretClient(
      keyVaultUri,
      new DefaultAzureCredential()
    );
  }

  // Resolve all secrets in parallel
  const [docIntelKey, openAIKey, storageConn, speechKey] = await Promise.all([
    resolveSecret(keyVaultClient, KV_SECRET_DOC_INTEL_KEY, "DOC_INTEL_KEY"),
    resolveSecret(keyVaultClient, KV_SECRET_OPENAI_KEY, "OPENAI_KEY"),
    resolveSecret(
      keyVaultClient,
      KV_SECRET_STORAGE_CONN,
      "STORAGE_CONNECTION_STRING"
    ),
    resolveSecret(keyVaultClient, KV_SECRET_SPEECH_KEY, "SPEECH_KEY"),
  ]);

  // Document Intelligence client
  const docIntelEndpoint = process.env["DOC_INTEL_ENDPOINT"];
  if (!docIntelEndpoint) {
    throw new Error("DOC_INTEL_ENDPOINT environment variable is required.");
  }
  _docIntelClient = new DocumentAnalysisClient(
    docIntelEndpoint,
    new AzureKeyCredential(docIntelKey)
  );

  // Azure OpenAI client
  const openAIEndpoint = process.env["OPENAI_ENDPOINT"];
  if (!openAIEndpoint) {
    throw new Error("OPENAI_ENDPOINT environment variable is required.");
  }
  _openAIClient = new AzureOpenAI({
    endpoint: openAIEndpoint,
    apiKey: openAIKey,
    apiVersion: OPENAI_API_VERSION,
  });

  // Blob Storage client
  _blobServiceClient = BlobServiceClient.fromConnectionString(storageConn);

  // Speech key (stored for use by TTS service)
  _speechKey = speechKey;
}
