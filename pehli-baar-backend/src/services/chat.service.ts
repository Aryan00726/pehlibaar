/**
 * Chat Service — GPT-4o stateful Q&A with document context
 *
 * Enables follow-up questions about a previously decoded document.
 * Maintains conversation history through the session store and sends
 * the full context to GPT-4o for contextual answers.
 *
 * @module services/chat.service
 */

import { getOpenAIClient } from "../config/azure.js";
import { telemetry } from "../config/azure.js";
import {
  OPENAI_DEPLOYMENT_NAME,
  OPENAI_MAX_TOKENS_CHAT,
  OPENAI_TEMPERATURE,
  UPSTREAM_TIMEOUT_MS,
} from "../constants.js";
import { LANGUAGE_NAME_MAP } from "../utils/languageMap.js";
import type { SupportedLanguage, ConversationTurn } from "../types/index.js";
import { AppError, ErrorCode } from "../types/index.js";

/**
 * Builds the chat system prompt with document context and conversation history.
 * Replaces {{LANGUAGE}}, {{DOCUMENT_CONTEXT}}, and {{CONVERSATION_HISTORY}} placeholders.
 */
function buildChatSystemPrompt(
  language: SupportedLanguage,
  documentContext: string,
  conversationHistory: ConversationTurn[]
): string {
  const langName = LANGUAGE_NAME_MAP[language];

  const historyText =
    conversationHistory.length > 0
      ? conversationHistory
          .map((turn) => `${turn.role === "user" ? "Student" : "Pehli Baar"}: ${turn.content}`)
          .join("\n")
      : "(No previous conversation)";

  return `You are "Pehli Baar" — a helpful older sibling for a first-generation college student in India.
You have already read and understood their document. The student will ask you follow-up questions.

RULES:
1. Answer ONLY in ${langName}. Never switch languages mid-response.
2. Keep answers short — maximum 4 sentences. The student is reading on a phone.
3. If the answer is in the document, cite it ("Teri letter mein likha hai ki...").
4. If the answer is NOT in the document, say so clearly and suggest where they can find out
   (admission office, helpline number if visible in doc, official website).
5. Never invent fees, dates, or rules that are not in the document.
6. If the student asks something personal or unrelated to the document, gently steer back.
7. Be warm. They are probably scared. Use "tum" not "aap" in Hindi (informal, friendly).

DOCUMENT CONTEXT:
${documentContext}

CONVERSATION HISTORY:
${historyText}`;
}

/**
 * Generates a contextual chat reply using GPT-4o.
 *
 * Takes the original document context, existing conversation history, and
 * the new user message, then returns a reply grounded in the document.
 *
 * @param documentContext - the original extracted + simplified text from the document
 * @param conversationHistory - array of previous conversation turns
 * @param userMessage - the new question from the student
 * @param language - the target language code for the response
 * @returns the assistant's reply as a plain text string
 * @throws {AppError} UPSTREAM_TIMEOUT if GPT-4o takes longer than 30 seconds
 * @throws {AppError} INTERNAL_ERROR for unexpected failures
 */
export async function chatWithContext(
  documentContext: string,
  conversationHistory: ConversationTurn[],
  userMessage: string,
  language: SupportedLanguage
): Promise<string> {
  if (process.env["SIMULATION_MODE"] === "true") {
    const query = userMessage.toLowerCase();
    const isHostel = documentContext.includes("HOSTEL");
    const isScholarship = documentContext.includes("SCHOLARSHIP");

    if (isHostel) {
      const responses: Record<string, { fee: string; hostel: string; docs: string; default: string }> = {
        hi: {
          fee: "हॉस्टल का सालाना किराया ₹18,000 है और ₹5,000 रिफंडेबल सिक्योरिटी डिपॉजिट है।",
          hostel: "हॉस्टल गेट बंद होने का समय रात 9:00 बजे है। तुझे रात 9:00 बजे से पहले अंदर आना होगा।",
          docs: "हॉस्टल के लिए तुझे अलॉटमेंट फॉर्म H-10 और माता-पिता का अप्रूवल फॉर्म भरकर वार्डन ऑफिस में जमा करना होगा।",
          default: "तेरी हॉस्टल अलॉटमेंट फीस जमा करने की अंतिम तिथि 18 जुलाई 2026 है। कुछ और पूछना है?"
        },
        en: {
          fee: "The annual hostel rent is ₹18,000, and the refundable security deposit is ₹5,000.",
          hostel: "The hostel gate closes at 9:00 PM. You must enter before that.",
          docs: "You need to submit the Hostel Allotment Form (Form H-10) and parental guardian approval form to the Warden's Office.",
          default: "Your hostel payment deadline is 18 July 2026. Do you have any other questions?"
        }
      };
      const langRes = (responses[language] ?? responses["hi"] ?? responses["en"]) as { fee: string; hostel: string; docs: string; default: string };
      if (query.includes("fee") || query.includes("किराया") || query.includes("पैसा") || query.includes("रुपए") || query.includes("pay") || query.includes("rent") || query.includes("पैसे")) {
        return langRes.fee;
      }
      if (query.includes("gate") || query.includes("बंद") || query.includes("timing") || query.includes("रात") || query.includes("नियम") || query.includes("rule")) {
        return langRes.hostel;
      }
      if (query.includes("doc") || query.includes("दस्तावेज") || query.includes("form") || query.includes("फार्म") || query.includes("पेपर")) {
        return langRes.docs;
      }
      return langRes.default;
    } else if (isScholarship) {
      const responses: Record<string, { fee: string; hostel: string; docs: string; default: string }> = {
        hi: {
          fee: "इस योजना के तहत तुझे सालाना ₹25,000 की छात्रवृत्ति (स्कॉलरशिप) राशि मिलेगी।",
          hostel: "यह स्कॉलरशिप सीधे तेरी पढ़ाई की फीस (tuition fees) में काम आएगी। हॉस्टल के लिए इसमें कोई अलग से राशि नहीं है।",
          docs: "स्कॉलरशिप के लिए तुझे तहसीलदार का मूल आय प्रमाण पत्र (सालाना आय ₹2,50,000 से कम) और 12वीं की मार्कशीट जमा करनी होगी।",
          default: "इस स्कॉलरशिप फॉर्म को भरने की अंतिम तिथि 31 अगस्त 2026 है। कुछ और पूछना है?"
        },
        en: {
          fee: "Under this scholarship scheme, you will get a grant of ₹25,000 per year.",
          hostel: "This scholarship is for tuition fees and does not cover hostel accommodation.",
          docs: "You must submit an original family income certificate from the Tehsildar (income < ₹2,50,000) and your Class 12 marksheet.",
          default: "The deadline to apply online for this scholarship is 31 August 2026. Let me know if you have other questions!"
        }
      };
      const langRes = (responses[language] ?? responses["hi"] ?? responses["en"]) as { fee: string; hostel: string; docs: string; default: string };
      if (query.includes("fee") || query.includes("कितना") || query.includes("पैसा") || query.includes("रुपए") || query.includes("amount") || query.includes("scholarship") || query.includes("पैसे")) {
        return langRes.fee;
      }
      if (query.includes("hostel") || query.includes("हॉस्टल") || query.includes("रहने") || query.includes("accommodation")) {
        return langRes.hostel;
      }
      if (query.includes("doc") || query.includes("दस्तावेज") || query.includes("certificate") || query.includes("प्रमाण") || query.includes("आय") || query.includes("marksheet")) {
        return langRes.docs;
      }
      return langRes.default;
    } else {
      // Default admission letter
      const responses: Record<string, { fee: string; hostel: string; docs: string; default: string }> = {
        hi: {
          fee: "तेरी एडमिशन फीस ₹15,250 है। इसे ऑनलाइन कॉलेज के पोर्टल पर जाकर 15 जुलाई 2026 से पहले जमा करना होगा।",
          hostel: "हॉस्टल के लिए तुझे ₹8,000 अलग से देने होंगे और 18 julho 2026 से पहले फॉर्म H-10 जमा करना होगा।",
          docs: "सत्यापन (Verification) के लिए तुझे कक्षा 12वीं की मूल मार्कशीट, पासिंग सर्टिफिकेट और आधार कार्ड लेकर 20 जुलाई को कमरा नंबर 102 में जाना है।",
          default: "तेरे इस पत्र के अनुसार, तुझे 15 जुलाई तक फीस भरनी है और 20 जुलाई को डाक्यूमेंट्स वेरिफिकेशन के लिए जाना है। कुछ और पूछना है?"
        },
        en: {
          fee: "Your admission fee is ₹15,250. You need to pay it online through the college portal on or before 15 July 2026.",
          hostel: "For hostel accommodation, you must pay ₹8,000 and submit Form H-10 by 18 July 2026.",
          docs: "For verification, you must take your original Class 12 marksheet, passing certificate, and Aadhaar card to Room 102 on 20 July.",
          default: "According to your admission letter, you need to pay your fees by 15 July and complete document verification on 20 July. Let me know if you have other questions!"
        }
      };
      const langRes = (responses[language] ?? responses["hi"] ?? responses["en"]) as { fee: string; hostel: string; docs: string; default: string };
      if (query.includes("fee") || query.includes("फीस") || query.includes("पैसा") || query.includes("रुपए") || query.includes("pay") || query.includes("ਕੀਮਤ") || query.includes("பணம்") || query.includes("पैसे")) {
        return langRes.fee;
      }
      if (query.includes("hostel") || query.includes("हॉस्टल") || query.includes("रहने") || query.includes("कमरा") || query.includes("விடுதி") || query.includes("হোস্টেল")) {
        return langRes.hostel;
      }
      if (query.includes("doc") || query.includes("दस्तावेज") || query.includes("कागज") || query.includes("marksheet") || query.includes("आधार") || query.includes("ஆவணம்") || query.includes("দলিল")) {
        return langRes.docs;
      }
      return langRes.default;
    }
  }

  const client = getOpenAIClient();

  const systemPrompt = buildChatSystemPrompt(
    language,
    documentContext,
    conversationHistory
  );

  try {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, UPSTREAM_TIMEOUT_MS);

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userMessage },
    ];

    const response = await client.chat.completions.create(
      {
        model: OPENAI_DEPLOYMENT_NAME,
        messages: messages,
        max_tokens: OPENAI_MAX_TOKENS_CHAT,
        temperature: OPENAI_TEMPERATURE,
      },
      {
        signal: abortController.signal,
      }
    );

    clearTimeout(timeoutId);

    const choice = response.choices[0];
    const content = choice?.message?.content;

    if (!content) {
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        "AI returned an empty response. Please try asking again."
      );
    }

    return content.trim();
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }

    // Handle timeout
    if (
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("aborted"))
    ) {
      throw new AppError(
        ErrorCode.UPSTREAM_TIMEOUT,
        "Chat response timed out. Please try again."
      );
    }

    // Log unexpected errors
    if (telemetry) {
      telemetry.trackException({
        exception: err instanceof Error ? err : new Error(String(err)),
      });
    }

    throw new AppError(
      ErrorCode.INTERNAL_ERROR,
      "An error occurred while processing your question. Please try again."
    );
  }
}
