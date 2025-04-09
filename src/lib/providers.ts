import { configEnv } from "../config/env.ts";
import { logError, logInfo } from "../utils/logger.ts";

export interface ChatMessage { // Add export keyword
  role: "system" | "user" | "assistant";
  content: string;
}

// Helper function to handle API requests with retry logic
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  delay = 1000,
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      return response;
    } catch (error: any) { // Add type annotation
      if (attempt === retries) {
        await logError(
          `fetchWithRetry failed after ${retries} attempts: ${error.message}`,
        );
        throw error;
      }
      console.warn(`Retrying API request (${attempt}/${retries})...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw new Error("Unexpected fetch retry failure.");
}

// Standardized request handler for LLM APIs
async function callLLMApi(
  apiURL: string,
  headers: Record<string, string>,
  body: Record<string, unknown> = {},
): Promise<string> {
  try {
    // logInfo(`Sending request to: ${apiURL}`);
    // logInfo(`Request Body:\n${JSON.stringify(body, null, 2)}`);

    const response = await fetchWithRetry(apiURL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    // logInfo(`LLM Response:\n${JSON.stringify(data, null, 2)}`);

    // Parse response based on provider
    if (configEnv.LLM_PROVIDER === "openai") {
      return data.choices?.[0]?.message?.content ||
        "Error generating response.";
    } else if (configEnv.LLM_PROVIDER === "gemini") {
      return data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Error generating response.";
    }
    return "Unknown LLM provider response format.";
  } catch (error: any) { // Add type annotation
    await logError(`callLLMApi error: ${error.message}`);
    return "I'm having trouble processing that request.";
  }
}

// Fetch response from LLM provider
export async function fetchLLMResponse(
  history: ChatMessage[],
): Promise<string> {
  let apiURL = "";
  let headers: Record<string, string> = {};
  let body: Record<string, unknown> = {};

  logInfo(
    `LLM Provider: ${configEnv.LLM_PROVIDER}, Model: ${configEnv.MODEL_NAME}`,
  );

  switch (configEnv.LLM_PROVIDER) {
    case "openai":
      if (!configEnv.OPENAI_API_KEY) return "Error: Missing OpenAI API key.";
      apiURL = "https://api.openai.com/v1/chat/completions";
      headers = {
        Authorization: `Bearer ${configEnv.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      };
      body = { model: configEnv.MODEL_NAME, messages: history };
      break;

    case "gemini":
      if (!configEnv.GEMINI_API_KEY) return "Error: Missing Gemini API key.";
      apiURL =
        `https://generativelanguage.googleapis.com/v1beta/models/${configEnv.MODEL_NAME}:generateContent?key=${configEnv.GEMINI_API_KEY}`;
      headers = { "Content-Type": "application/json" };
      body = {
        contents: history.map((msg: ChatMessage) => ({
          role: "user",
          parts: [{ text: msg.content }],
        })),
      };
      break;

    default:
      await logError("Invalid LLM Provider. Check LLM_PROVIDER in .env.");
      return "Error: Invalid LLM provider.";
  }

  return callLLMApi(apiURL, headers, body);
}
