import { config } from "https://deno.land/std@0.127.0/dotenv/mod.ts";

// Load .env only if not in production
// const env = Deno.env.get("DENO_ENV") !== "production"
//   ? config().then((e) => e)
//   : Deno.env.toObject();

if (Deno.env.get("DENO_ENV") !== "production") {
    const envConfig = await config();
    for (const [key, value] of Object.entries(envConfig)) {
      Deno.env.set(key, value);
    }
}

export interface EnvConfig {
  TELEGRAM_BOT_TOKEN: string;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  LLM_PROVIDER: string;
  MODEL_NAME: string;
  CONTEXT_SIZE: number;
  BOT_NAME?: string;
  RELATIVE_TIME_THRESHOLD_SECONDS?: number;
  GEMINI_ENABLE_GROUNDING?: boolean; // Flag to enable Gemini grounding
  GOOGLE_PROJECT_ID?: string; // Required for Vertex AI endpoint
  GOOGLE_LOCATION?: string; // Required for Vertex AI endpoint (e.g., us-central1)
  GOOGLE_APPLICATION_CREDENTIALS?: string; // Path to service account key file for Vertex AI auth
}

// Validate and enforce required variables
function validateEnv(env: Record<string, string | undefined>): EnvConfig {
  const required = ["TELEGRAM_BOT_TOKEN"];

  if (!env.OPENAI_API_KEY && !env.GEMINI_API_KEY) {
    throw new Error(
      "Missing API key: Please set either OPENAI_API_KEY or GEMINI_API_KEY.",
    );
  }

  const missing = required.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(
      "Missing required environment variables: " + missing.join(", "),
    );
  }

  // Additional validation for Gemini provider using Vertex AI endpoint
  const provider = (env.LLM_PROVIDER?.trim().toLowerCase() || "gemini");
  if (provider === "gemini") {
    if (!env.GOOGLE_PROJECT_ID) {
      throw new Error(
        "Missing GOOGLE_PROJECT_ID environment variable, required for Gemini (Vertex AI).",
      );
    }
    if (!env.GOOGLE_LOCATION) {
      throw new Error(
        "Missing GOOGLE_LOCATION environment variable, required for Gemini (Vertex AI).",
      );
    }
    // Service account key is needed for Vertex AI auth
    if (!env.GOOGLE_APPLICATION_CREDENTIALS) {
       throw new Error(
        "Missing GOOGLE_APPLICATION_CREDENTIALS environment variable (path to service account key file), required for Gemini (Vertex AI).",
      );
    }
  }


  return {
    TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN!,
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    GEMINI_API_KEY: env.GEMINI_API_KEY,
    LLM_PROVIDER: (env.LLM_PROVIDER?.trim().toLowerCase() || "gemini"),
    MODEL_NAME: env.MODEL_NAME || "gemini-2.5-pro-exp-03-25",
    CONTEXT_SIZE: parseInt(env.CONTEXT_SIZE || "20"), // Default to 20 last messages
    BOT_NAME: env.BOT_NAME || "Telence",
    RELATIVE_TIME_THRESHOLD_SECONDS: parseInt(
      env.RELATIVE_TIME_THRESHOLD_SECONDS || "600", // Default to 10 minutes (600 seconds)
    ),
    GEMINI_ENABLE_GROUNDING: (env.GEMINI_ENABLE_GROUNDING || "false")
      .toLowerCase() === "true", // Default to false
    GOOGLE_PROJECT_ID: env.GOOGLE_PROJECT_ID, // Will be validated above if provider is gemini
    GOOGLE_LOCATION: env.GOOGLE_LOCATION, // Will be validated above if provider is gemini
    GOOGLE_APPLICATION_CREDENTIALS: env.GOOGLE_APPLICATION_CREDENTIALS, // Will be validated above if provider is gemini
  };
}

export const configEnv = validateEnv(Deno.env.toObject());
