import { config } from "https://deno.land/std@0.127.0/dotenv/mod.ts";

// Load .env only if not in production
const env = Deno.env.get("DENO_ENV") !== "production"
  ? config().then((e) => e)
  : Deno.env.toObject();

export interface EnvConfig {
  TELEGRAM_BOT_TOKEN: string;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  LLM_PROVIDER: string;
  MODEL_NAME: string;
  CONTEXT_SIZE: number;
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
    LLM_PROVIDER: (env.LLM_PROVIDER?.trim().toLowerCase() || "openai"),
    MODEL_NAME: env.MODEL_NAME || "chatgpt-4o-latest",
    CONTEXT_SIZE: parseInt(env.CONTEXT_SIZE || "10"),
  };
}

// Since config() is async, we need to handle it properly
export const configEnv = await env.then(validateEnv);
