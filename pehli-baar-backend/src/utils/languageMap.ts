/**
 * Language Map — Voice names, display names, and unreadable messages
 *
 * Maps language codes to Azure Neural TTS voice names, human-readable
 * language names, and per-language error messages for unreadable documents.
 *
 * @module utils/languageMap
 */

import type { SupportedLanguage } from "../types/index.js";

/**
 * Maps language codes to Azure Neural TTS voice names.
 * These voices are used by the Speech SDK for audio synthesis.
 */
export const LANGUAGE_VOICE_MAP: Record<SupportedLanguage, string> = {
  hi: "hi-IN-SwaraNeural",
  ta: "ta-IN-PallaviNeural",
  bn: "bn-IN-TanishaaNeural",
  mr: "mr-IN-AarohiNeural",
  te: "te-IN-ShrutiNeural",
  kn: "kn-IN-SapnaNeural",
  ml: "ml-IN-SobhanaNeural",
  gu: "gu-IN-DhwaniNeural",
  pa: "pa-IN-OjaswanthNeural",
  en: "en-IN-NeerjaNeural",
};

/**
 * Maps language codes to their full human-readable names.
 * Used in system prompts for GPT-4o (e.g. "Explain in Hindi").
 */
export const LANGUAGE_NAME_MAP: Record<SupportedLanguage, string> = {
  hi: "Hindi",
  ta: "Tamil",
  bn: "Bengali",
  mr: "Marathi",
  te: "Telugu",
  kn: "Kannada",
  ml: "Malayalam",
  gu: "Gujarati",
  pa: "Punjabi",
  en: "English",
};

/**
 * Per-language apology messages for when a document is unreadable.
 * These are returned to the user in their selected language.
 */
export const LANGUAGE_UNREADABLE_MESSAGES: Record<SupportedLanguage, string> = {
  hi: "माफ़ कीजिए, यह दस्तावेज़ पढ़ने में मुश्किल है। कृपया एक साफ़ फ़ोटो दोबारा लें।",
  ta: "மன்னிக்கவும், இந்த ஆவணத்தைப் படிக்க முடியவில்லை. தயவுசெய்து தெளிவான புகைப்படம் எடுக்கவும்.",
  bn: "দুঃখিত, এই নথিটি পড়া যাচ্ছে না। অনুগ্রহ করে একটি পরিষ্কার ছবি আবার তুলুন।",
  mr: "माफ करा, हा दस्तऐवज वाचता येत नाही. कृपया स्पष्ट फोटो पुन्हा घ्या.",
  te: "క్షమించండి, ఈ పత్రం చదవడం కష్టంగా ఉంది. దయచేసి స్పష్టమైన ఫోటో మళ్లీ తీయండి.",
  kn: "ಕ್ಷಮಿಸಿ, ಈ ಡಾಕ್ಯುಮೆಂಟ್ ಓದಲಾಗುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ಸ್ಪಷ್ಟವಾದ ಫೋಟೋ ಮತ್ತೆ ತೆಗೆಯಿರಿ.",
  ml: "ക്ഷമിക്കണം, ഈ ഡോക്യുമെന്റ് വായിക്കാൻ കഴിയുന്നില്ല. ദയവായി വ്യക്തമായ ഫോട്ടോ വീണ്ടും എടുക്കുക.",
  gu: "માફ કરશો, આ દસ્તાવેજ વાંચી શકાતો નથી. કૃપા કરીને સ્પષ્ટ ફોટો ફરીથી લો.",
  pa: "ਮੁਆਫ਼ ਕਰਨਾ, ਇਹ ਦਸਤਾਵੇਜ਼ ਪੜ੍ਹਿਆ ਨਹੀਂ ਜਾ ਸਕਦਾ। ਕਿਰਪਾ ਕਰਕੇ ਸਾਫ਼ ਫ਼ੋਟੋ ਦੁਬਾਰਾ ਲਓ।",
  en: "Sorry, this document is difficult to read. Please take a clearer photo and try again.",
};

/** Array of all supported language codes */
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = Object.keys(
  LANGUAGE_VOICE_MAP
) as SupportedLanguage[];

/**
 * Checks whether a given string is a valid supported language code.
 *
 * @param code - the language code to validate
 * @returns true if the code is a supported language
 */
export function isSupportedLanguage(code: string): code is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(code as SupportedLanguage);
}
