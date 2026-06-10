/**
 * Image Preprocessing — Resize and convert uploads before OCR
 *
 * Uses `sharp` to normalise uploaded images to a consistent format
 * suitable for Azure Document Intelligence. PDFs are passed through as-is.
 *
 * @module utils/imagePreprocess
 */

import sharp from "sharp";
import {
  IMAGE_MAX_DIMENSION,
  IMAGE_JPEG_QUALITY,
} from "../constants.js";

/**
 * Checks whether a buffer appears to be a PDF based on magic bytes.
 *
 * @param buffer - the file buffer to check
 * @returns true if the buffer starts with the PDF magic bytes (%PDF)
 */
export function isPdfBuffer(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x25 && // %
    buffer[1] === 0x50 && // P
    buffer[2] === 0x44 && // D
    buffer[3] === 0x46    // F
  );
}

/**
 * Preprocesses an uploaded image for optimal OCR extraction.
 *
 * - Resizes the image so the longest side is at most 2048px (preserving aspect ratio)
 * - Converts to JPEG at quality 85 for consistent processing
 * - Strips EXIF/metadata and auto-orients based on EXIF rotation
 *
 * PDFs are returned as-is since Document Intelligence handles them natively.
 *
 * @param buffer - the raw uploaded file buffer
 * @param mimeType - the MIME type of the uploaded file
 * @returns the preprocessed buffer (JPEG for images, original for PDFs)
 * @throws if sharp encounters a corrupt or unsupported image format
 */
export async function preprocessImage(
  buffer: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  // PDFs go straight through — Doc Intelligence handles them natively
  if (mimeType === "application/pdf" || isPdfBuffer(buffer)) {
    return { buffer, mimeType: "application/pdf" };
  }

  const processed = await sharp(buffer)
    .rotate() // Auto-orient based on EXIF data
    .resize({
      width: IMAGE_MAX_DIMENSION,
      height: IMAGE_MAX_DIMENSION,
      fit: "inside",           // Maintain aspect ratio, fit within bounds
      withoutEnlargement: true, // Don't upscale small images
    })
    .jpeg({
      quality: IMAGE_JPEG_QUALITY,
      mozjpeg: true, // Better compression
    })
    .toBuffer();

  return { buffer: processed, mimeType: "image/jpeg" };
}
