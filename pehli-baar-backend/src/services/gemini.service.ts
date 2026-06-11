/**
 * Gemini Service — Google AI Studio Integration
 *
 * Handles all communication with the Gemini API for:
 * 1. Document analysis (vision + text generation)
 * 2. Follow-up chat with document context
 *
 * Uses the free Gemini 2.0 Flash model via REST API.
 * No SDK dependency — pure fetch-based for lightweight deployment.
 *
 * @module services/gemini.service
 */

const GEMINI_API_KEY = process.env["GEMINI_API_KEY"] ?? "";
const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

/** System prompt for document analysis */
const DOCUMENT_ANALYSIS_PROMPT = `You are Pehli Baar Assistant, a helpful elder sibling for first-generation college students in India. When given a document image or PDF, extract and explain it in simple Hindi + English.

Return ONLY this JSON, nothing else:
{
  "mostImportantPoint": "(string) 3-4 sentences, simple Hindi+English, explaining what the student must know — deadlines, money, actions",
  "cards": [{ "label": "(string) short label", "value": "(string) the extracted value" }],
  "nextSteps": ["(string) numbered action the student must take"],
  "suggestedQuestions": ["(string) follow-up question student might ask"]
}

Rules:
- cards: Extract 2-6 key numbers/dates/amounts from the document (fees, deadlines, account numbers, dates, etc.)
- nextSteps: Provide 3-5 clear numbered actions
- suggestedQuestions: Provide 3 follow-up questions
- Tone: Warm, like a bade bhai/behen. No jargon. If a term is complex, explain it in parentheses.
- Mix Hindi + English naturally. Example: "Admission fee ₹45,000 hai jo 15 July tak jama karni hai."`;

/** System prompt for follow-up chat */
const CHAT_SYSTEM_PROMPT = `You are Pehli Baar Assistant, a warm and helpful elder sibling (bade bhai/behen) for first-generation college students in India.

You are answering follow-up questions about a document the student uploaded. Use the document context provided to give accurate, helpful answers.

Rules:
- Answer in simple Hindi + English (Hinglish), mixing naturally
- Never use jargon without explaining it in parentheses
- Be warm, encouraging, and supportive
- If you don't know something from the document, say so honestly
- Keep answers concise but complete (2-4 paragraphs max)`;

/**
 * Result from Gemini document analysis.
 */
export interface GeminiDocumentResult {
  mostImportantPoint: string;
  cards: Array<{ label: string; value: string }>;
  nextSteps: string[];
  suggestedQuestions: string[];
}

/**
 * Calls the Gemini API with the given request body.
 * 
 * @param body - The full request payload for generateContent
 * @returns The parsed JSON response
 * @throws Error if the API call fails or returns an error
 */
async function callGemini(body: Record<string, unknown>): Promise<any> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set. Get a free key from https://aistudio.google.com/apikey");
  }

  const url = `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const isRetryable = response.status === 429 || response.status === 503 || response.status >= 500;
        
        if (isRetryable && attempt < maxRetries) {
          const delay = attempt * 1500; // 1.5s, 3s
          process.stderr.write(`⚠️  Gemini API returned ${response.status} (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...\n`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      const data = await response.json() as any;

      // Extract text content from the response
      const candidate = data?.candidates?.[0];
      if (!candidate?.content?.parts?.[0]?.text) {
        throw new Error("Gemini returned an empty response.");
      }

      return candidate.content.parts[0].text;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = attempt * 1500;
        process.stderr.write(`⚠️  Gemini call failed (attempt ${attempt}/${maxRetries}): ${lastError.message}. Retrying in ${delay}ms...\n`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw lastError || new Error("Failed to call Gemini API after retries.");
}

/**
 * Analyzes a document image/PDF using Gemini Vision.
 * Sends the file as base64 inline data and returns structured JSON.
 *
 * @param base64Data - Base64-encoded file content
 * @param mimeType - MIME type of the file (image/jpeg, image/png, application/pdf, etc.)
 * @returns Parsed document analysis result
 */
export async function analyzeDocument(
  base64Data: string,
  mimeType: string
): Promise<GeminiDocumentResult> {
  const body = {
    system_instruction: {
      parts: [{ text: DOCUMENT_ANALYSIS_PROMPT }],
    },
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          },
          {
            text: "Please read and explain this college document.",
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  };

  const responseText = await callGemini(body);

  // Parse the JSON response
  try {
    const parsed = JSON.parse(responseText) as GeminiDocumentResult;

    // Validate required fields
    if (!parsed.mostImportantPoint || !Array.isArray(parsed.cards) || !Array.isArray(parsed.nextSteps)) {
      throw new Error("Missing required fields in Gemini response");
    }

    return {
      mostImportantPoint: parsed.mostImportantPoint,
      cards: parsed.cards || [],
      nextSteps: parsed.nextSteps || [],
      suggestedQuestions: parsed.suggestedQuestions || [],
    };
  } catch (parseErr) {
    // If JSON parsing fails, try to extract JSON from the text
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as GeminiDocumentResult;
      return {
        mostImportantPoint: parsed.mostImportantPoint || "Document could not be fully parsed.",
        cards: parsed.cards || [],
        nextSteps: parsed.nextSteps || [],
        suggestedQuestions: parsed.suggestedQuestions || [],
      };
    }
    throw new Error(`Failed to parse Gemini response as JSON: ${responseText.substring(0, 200)}`);
  }
}

/**
 * Sends a follow-up chat message to Gemini with document context.
 *
 * @param documentContext - The original document analysis text for grounding
 * @param conversationHistory - Previous conversation turns
 * @param userMessage - The user's new question
 * @param language - Preferred language code
 * @returns The assistant's reply text
 */
export async function chatWithDocument(
  documentContext: string,
  conversationHistory: Array<{ role: string; content: string }>,
  userMessage: string,
  language: string
): Promise<string> {
  // Build conversation contents for Gemini
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  // First message includes document context
  contents.push({
    role: "user",
    parts: [{ text: `Here is the document context:\n\n${documentContext}\n\nPlease answer questions about this document. Respond in ${language === "en" ? "English" : "simple Hindi + English (Hinglish)"}.` }],
  });

  contents.push({
    role: "model",
    parts: [{ text: "Haan bilkul! Maine document padh liya hai. Aap koi bhi sawaal poochho, main simple bhasha mein samjhaunga. 😊" }],
  });

  // Add conversation history
  for (const turn of conversationHistory) {
    contents.push({
      role: turn.role === "user" ? "user" : "model",
      parts: [{ text: turn.content }],
    });
  }

  // Add the new user message
  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  const body = {
    system_instruction: {
      parts: [{ text: CHAT_SYSTEM_PROMPT }],
    },
    contents,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1024,
    },
  };

  return await callGemini(body);
}

/**
 * Sends a general support message to Gemini with conversation history.
 *
 * @param conversationHistory - Previous conversation turns
 * @param userMessage - The user's new question
 * @param language - Preferred language code
 * @returns The assistant's reply text
 */
export async function generalSupportChat(
  conversationHistory: Array<{ role: string; content: string }>,
  userMessage: string,
  language: string
): Promise<string> {
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  // System instruction for general support
  const SUPPORT_SYSTEM_PROMPT = `You are Pehli Baar Support Assistant, a warm and helpful elder sibling (bade bhai/behen) for first-generation college students in India.
Your goal is to answer general queries about college applications, admissions, scholarships, fees, document requests (like bonafide certificates, transfer certificates), hostel life, or how to use the Pehli Baar app.

Rules:
- Answer in simple Hinglish (Hindi + English mixed naturally), unless the student specifically asks in English.
- Always explain any complex administrative or college terms in parentheses.
- Be extremely encouraging, kind, and supportive.
- If you don't know the answer to a specific official or college policy, tell the student how they can find out (e.g., visiting the administrative block, checking the notice board, talking to senior students).
- Keep answers warm and concise (2-4 paragraphs max).`;

  // Add conversation history
  for (const turn of conversationHistory) {
    contents.push({
      role: turn.role === "user" ? "user" : "model",
      parts: [{ text: turn.content }],
    });
  }

  // Add the new user message
  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  const body = {
    system_instruction: {
      parts: [{ text: SUPPORT_SYSTEM_PROMPT }],
    },
    contents,
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 1024,
    },
  };

  return await callGemini(body);
}

