import { configEnv } from "../config/env.ts";
import { logError, logInfo } from "../utils/logger.ts";
import { create, verify, decode, type Header, type Payload } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts"; // For potential key formatting

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// --- Google Auth Token Logic ---
interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;
const TOKEN_EXPIRY_BUFFER_SECONDS = 60; // Get new token 60s before expiry

async function importPrivateKey(pem: string): Promise<CryptoKey> {
    // Remove header, footer, and newlines
    const pemContents = pem
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\s+/g, "");
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    try {
        return await crypto.subtle.importKey(
          "pkcs8",
          binaryDer,
          { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
          true, // Can be used for signing
          ["sign"]
        );
    } catch (importError) {
        logError("Failed to import private key", importError);
        throw new Error("Could not import private key from service account file. Ensure it's a valid PKCS#8 key.");
    }
}


async function getGoogleAuthToken(): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);

  // Return cached token if valid
  if (cachedToken && cachedToken.expiresAt > nowSeconds + TOKEN_EXPIRY_BUFFER_SECONDS) {
    // logInfo("Using cached Google Auth Token");
    return cachedToken.token;
  }

  logInfo("Fetching new Google Auth Token...");
  if (!configEnv.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS path in config.");
  }

  try {
    const keyFileContent = await Deno.readTextFile(configEnv.GOOGLE_APPLICATION_CREDENTIALS);
    const keyData: ServiceAccountKey = JSON.parse(keyFileContent);

    const privateKey = await importPrivateKey(keyData.private_key);

    const claims: Payload = {
      iss: keyData.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform", // Scope for Vertex AI
      aud: "https://oauth2.googleapis.com/token",
      exp: nowSeconds + 3600, // Expires in 1 hour
      iat: nowSeconds,
    };

    const header: Header = { alg: "RS256", typ: "JWT" };

    const jwt = await create(header, claims, privateKey);

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Failed to fetch auth token: ${tokenResponse.status} ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 3600; // Default to 1 hour if not provided

    if (!accessToken) {
        throw new Error("Access token not found in Google's response.");
    }

    // Cache the new token
    cachedToken = {
      token: accessToken,
      expiresAt: nowSeconds + expiresIn,
    };
    logInfo("Successfully fetched and cached new Google Auth Token.");

    return accessToken;

  } catch (error: any) { // Add type annotation
    logError("Error getting Google Auth Token", error);
    cachedToken = null; // Clear cache on error
    throw new Error(`Failed to obtain Google Auth Token: ${error.message}`);
  }
}
// --- End Google Auth Token Logic ---


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
    } catch (error: any) {
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
      // Check for grounding metadata if needed
      // const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
      // if (groundingMetadata) {
      //   logInfo("Grounding metadata found:", groundingMetadata);
      // }
      return data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Error generating response.";
    }
    return "Unknown LLM provider response format.";
  } catch (error: any) { 
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
      // Use Vertex AI endpoint which requires OAuth2 token
      if (!configEnv.GOOGLE_PROJECT_ID || !configEnv.GOOGLE_LOCATION) {
         return "Error: Missing Google Project ID or Location for Vertex AI endpoint.";
      }
      if (!configEnv.GOOGLE_APPLICATION_CREDENTIALS) {
         // Should be caught by config validation, but good to check
         return "Error: Missing GOOGLE_APPLICATION_CREDENTIALS path.";
      }

      // Construct Vertex AI endpoint URL (removing API key)
      apiURL =
        `https://${configEnv.GOOGLE_LOCATION}-aiplatform.googleapis.com/v1beta1/projects/${configEnv.GOOGLE_PROJECT_ID}/locations/${configEnv.GOOGLE_LOCATION}/publishers/google/models/${configEnv.MODEL_NAME}:generateContent`;

      try {
        // Get the auth token
        const authToken = await getGoogleAuthToken();
        headers = {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
        };
      } catch (authError: any) {
        logError("Failed to get Google Auth Token", authError);
        return `Authentication Error: ${authError.message}`;
      }


      // Map roles and structure for Gemini API
      const geminiContents = history.map((msg: ChatMessage) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));

      // Prepare base body
      const geminiBody: Record<string, unknown> = {
        contents: geminiContents,
      };

      // Add grounding tools if enabled
      if (configEnv.GEMINI_ENABLE_GROUNDING) {
        logInfo("Gemini grounding enabled. Adding tools to request.");
        geminiBody.tools = [{
          googleSearch: {} // This works for 2.5 models 
        }];
      }

      body = geminiBody;
      break;

    default:
      await logError("Invalid LLM Provider. Check LLM_PROVIDER in .env.");
      return "Error: Invalid LLM provider.";
  }

  return callLLMApi(apiURL, headers, body);
}
