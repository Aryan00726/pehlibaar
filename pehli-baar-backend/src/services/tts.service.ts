/**
 * TTS Service — Azure Speech synthesis + Blob upload
 *
 * Synthesises audio from text using Azure Neural TTS voices,
 * uploads the resulting MP3 to Azure Blob Storage, and returns
 * a time-limited SAS URL for client playback.
 *
 * @module services/tts.service
 */

import * as speechSdk from "microsoft-cognitiveservices-speech-sdk";
import { getBlobServiceClient, getSpeechKey } from "../config/azure.js";
import { telemetry } from "../config/azure.js";
import { v4 as uuidv4 } from "uuid";
import {
  BLOB_CONTAINER_AUDIO,
  AUDIO_BLOB_TTL_SECONDS,
  AUDIO_BLOB_TTL_HOURS,
} from "../constants.js";
import { LANGUAGE_VOICE_MAP } from "../utils/languageMap.js";
import type { SupportedLanguage } from "../types/index.js";
import { AppError, ErrorCode } from "../types/index.js";
import {
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

/**
 * Synthesises text to speech using Azure Neural TTS, uploads the audio
 * to Blob Storage, and returns a SAS URL for playback.
 *
 * @param text - the text to synthesise (simplified document text or chat reply)
 * @param language - the language code determining which neural voice to use
 * @returns an object with the audio URL, expiry duration, and voice name
 * @throws {AppError} UPSTREAM_TIMEOUT if synthesis takes too long
 * @throws {AppError} INTERNAL_ERROR for unexpected failures
 */
export async function synthesiseAndUpload(
  text: string,
  language: SupportedLanguage
): Promise<{ audioUrl: string; expiresInSeconds: number; voiceName: string }> {
  if (process.env["SIMULATION_MODE"] === "true") {
    // Base64-encoded silent MP3 (about 1 second of silence)
    const silentMp3 = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjIyLjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAASDwALCwALCwALCwALCwALCwALCwALCwALCwALCwALCwALCwALCwALCwALCwALCwAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAADAAACAAADAAAQAAAAAAAAAAADAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zhHQAAAAAMAAAAAACAADAAAAAAEB5AAAACAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/zhEgAAAAAcAAAAAACAADAAAAAAEB5AAAACAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA────────────────AAAAAAAAAAAAAAP/zhEgAAAAAcAAAAAACAADAAAAAAEB5AAAACAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA────────────────AAAAAAAAAAAAAAP/zhEgAAAAAcAAAAAACAADAAAAAAEB5AAAACAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA────────────────AAAAAAAAAAAAAAP/zhEgAAAAAcAAAAAACAADAAAAAAEB5AAAACAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA────────────────AAAAAAAAAAAAAAP/zhEgAAAAAcAAAAAACAADAAAAAAEB5AAAACAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA────────────────AAAAAAAAAAAAAAP/";
    return {
      audioUrl: silentMp3,
      expiresInSeconds: 3600,
      voiceName: LANGUAGE_VOICE_MAP[language] || "en-IN-NeerjaNeural"
    };
  }

  const voiceName = LANGUAGE_VOICE_MAP[language];
  const speechKey = getSpeechKey();
  const speechRegion = process.env["SPEECH_REGION"] ?? "eastus";

  try {
    // Build SSML for neural voice
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${language}-IN">
  <voice name="${voiceName}">
    <prosody rate="0.95">${escapeXml(text)}</prosody>
  </voice>
</speak>`;

    // Synthesise audio
    const audioBuffer = await synthesiseSpeech(speechKey, speechRegion, ssml);

    // Upload to Blob Storage
    const audioUrl = await uploadAudioBlob(audioBuffer);

    return {
      audioUrl,
      expiresInSeconds: AUDIO_BLOB_TTL_SECONDS,
      voiceName,
    };
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }

    if (telemetry) {
      telemetry.trackException({
        exception: err instanceof Error ? err : new Error(String(err)),
      });
    }

    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      "Failed to generate audio. Please try again."
    );
  }
}

/**
 * Runs Azure Speech SDK synthesis and returns the audio buffer.
 * Uses pull-stream to collect audio data into a buffer.
 */
async function synthesiseSpeech(
  subscriptionKey: string,
  region: string,
  ssml: string
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const speechConfig = speechSdk.SpeechConfig.fromSubscription(
      subscriptionKey,
      region
    );

    // Output format: 16kHz 32kbps mono MP3
    speechConfig.speechSynthesisOutputFormat =
      speechSdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

    // Use null for audio output — we'll capture from the result
    const synthesizer = new speechSdk.SpeechSynthesizer(speechConfig);

    const timeoutId = setTimeout(() => {
      synthesizer.close();
      reject(
        new AppError(
          ErrorCode.UPSTREAM_TIMEOUT,
          "Audio synthesis timed out. Please try again."
        )
      );
    }, 30_000);

    synthesizer.speakSsmlAsync(
      ssml,
      (result) => {
        clearTimeout(timeoutId);
        synthesizer.close();

        if (
          result.reason === speechSdk.ResultReason.SynthesizingAudioCompleted
        ) {
          const audioData = result.audioData;
          resolve(Buffer.from(audioData));
        } else {
          const cancellation =
            speechSdk.CancellationDetails.fromResult(result);
          reject(
            new AppError(
              ErrorCode.INTERNAL_ERROR,
              `Speech synthesis failed: ${cancellation.reason}`
            )
          );
        }
      },
      (error) => {
        clearTimeout(timeoutId);
        synthesizer.close();
        reject(
          new AppError(
            ErrorCode.INTERNAL_ERROR,
            "Speech synthesis encountered an error."
          )
        );
      }
    );
  });
}

/**
 * Uploads an audio buffer to Azure Blob Storage and returns a SAS URL.
 *
 * @param audioBuffer - the MP3 audio data
 * @returns a SAS URL valid for AUDIO_BLOB_TTL_HOURS hours
 */
async function uploadAudioBlob(audioBuffer: Buffer): Promise<string> {
  const blobService = getBlobServiceClient();
  const containerClient = blobService.getContainerClient(BLOB_CONTAINER_AUDIO);

  // Ensure container exists
  await containerClient.createIfNotExists({ access: undefined });

  const blobName = `${uuidv4()}.mp3`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(audioBuffer, {
    blobHTTPHeaders: {
      blobContentType: "audio/mpeg",
    },
  });

  // Generate SAS URL
  const sasUrl = await generateSasUrl(containerClient.containerName, blobName);
  return sasUrl;
}

/**
 * Generates a SAS URL for a blob with time-limited read access.
 */
async function generateSasUrl(
  containerName: string,
  blobName: string
): Promise<string> {
  const blobService = getBlobServiceClient();

  // Try to get the account name and key from the service client URL
  // For connection-string-based clients, we use a user delegation key approach
  // or fall back to the blob URL with SAS token
  const containerClient = blobService.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);

  // Use the account-level generateSasUrl if available
  const expiresOn = new Date();
  expiresOn.setHours(expiresOn.getHours() + AUDIO_BLOB_TTL_HOURS);

  // For simplicity with connection string auth, use the blob client's generateSasUrl
  // This requires the connection string to contain the account key
  try {
    // Extract account name and key from the blob service URL
    const accountName = blobService.accountName;

    // We need to use a workaround since BlobServiceClient from connection string
    // doesn't expose the key directly. We'll use user delegation or direct SAS.
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse("r"),
        expiresOn,
      },
      blobService.credential as StorageSharedKeyCredential
    ).toString();

    return `${blobClient.url}?${sasToken}`;
  } catch {
    // Fallback: return the direct blob URL (works if container has public access)
    // In production, you'd use Managed Identity + user delegation key
    return blobClient.url;
  }
}

/**
 * Escapes XML special characters for safe SSML embedding.
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
