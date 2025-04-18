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
  };
}

export const configEnv = validateEnv(Deno.env.toObject());
