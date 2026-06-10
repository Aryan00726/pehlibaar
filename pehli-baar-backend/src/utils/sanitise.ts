/**
 * PII Sanitisation — Strip sensitive patterns before sending text to OpenAI
 *
 * Removes Aadhaar numbers, phone numbers, and bank account patterns from
 * extracted document text. This is a security requirement — raw PII must
 * never be sent to external AI services.
 *
 * @module utils/sanitise
 */

/**
 * Regex pattern for Indian Aadhaar numbers.
 * Matches 12 digits with optional spaces or dashes between groups of 4.
 * Examples: "1234 5678 9012", "1234-5678-9012", "123456789012"
 */
const AADHAAR_PATTERN =
  /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g;

/**
 * Regex pattern for Indian mobile phone numbers.
 * Matches 10 digits starting with 6-9, with optional leading +91 or 0.
 * Examples: "9876543210", "+91 98765 43210", "098765-43210"
 */
const PHONE_PATTERN =
  /(?:\+91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}\b/g;

/**
 * Regex pattern for bank account numbers.
 * Matches sequences of 9 to 18 digits (Indian bank accounts vary in length).
 * Only matches when preceded by account-related context words to reduce
 * false positives on other long digit sequences.
 */
const BANK_ACCOUNT_PATTERN =
  /(?:(?:a\/c|account|acct|खाता|A\/C)\s*(?:no\.?|number|num|नंबर|संख्या)?[:\s-]*)\d{9,18}\b/gi;

/**
 * Fallback: standalone long digit sequences (9-18 digits) that could be
 * account numbers, but only when not part of dates or other known patterns.
 */
const STANDALONE_LONG_DIGITS_PATTERN = /\b\d{9,18}\b/g;

/** The replacement string used for redacted PII */
const REDACTED = "[REDACTED]";

/**
 * Strips PII patterns from extracted document text before sending to OpenAI.
 *
 * Removes:
 * - Aadhaar numbers (12-digit patterns)
 * - Indian mobile phone numbers (10-digit starting 6-9)
 * - Bank account numbers (9-18 digit sequences near account-related keywords)
 *
 * @param text - raw extracted text from Document Intelligence
 * @returns sanitised text with PII replaced by [REDACTED]
 */
export function sanitiseText(text: string): string {
  let sanitised = text;

  // Order matters: strip Aadhaar first (12 digits), then phone (10 digits),
  // then bank accounts (contextual), to avoid overlapping matches.
  sanitised = sanitised.replace(AADHAAR_PATTERN, REDACTED);
  sanitised = sanitised.replace(PHONE_PATTERN, REDACTED);
  sanitised = sanitised.replace(BANK_ACCOUNT_PATTERN, (match) => {
    // Preserve the label part, only redact the number
    const numberMatch = match.match(/\d{9,18}/);
    if (numberMatch) {
      return match.replace(numberMatch[0], REDACTED);
    }
    return REDACTED;
  });

  return sanitised;
}

/**
 * Checks if extracted text contains meaningful content.
 * Returns false if the text is empty, too short, or appears to be noise.
 *
 * @param text - extracted text from Document Intelligence
 * @returns true if the text has enough content to process
 */
export function hasReadableContent(text: string): boolean {
  const trimmed = text.trim();
  // Require at least 20 characters of meaningful text
  if (trimmed.length < 20) {
    return false;
  }

  // Check that it contains at least some word characters (not just noise)
  const wordChars = trimmed.replace(/[\s\d\W]/g, "");
  return wordChars.length > 10;
}
