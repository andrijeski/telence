import { Context } from "https://deno.land/x/grammy@v1.20.0/mod.ts";

/**
 * Sends a long message to a Telegram chat, automatically splitting it into parts if needed.
 *
 * @param {Context} ctx - The Telegram bot context.
 * @param {string} message - The message to send.
 * @param {number} maxLength - Optional max length per message (default: 4000).
 */
export async function sendLongMessage(
  ctx: Context,
  message: string,
  maxLength = 4000,
) {
  if (!message || message.trim().length === 0) {
    console.warn("sendLongMessage: Attempted to send an empty message.");
    return;
  }

  const totalParts = Math.ceil(message.length / maxLength);

  for (let i = 0; i < totalParts; i++) {
    const part = message.substring(i * maxLength, (i + 1) * maxLength);
    await ctx.reply(
      `${part} ${totalParts > 1 ? `[${i + 1}/${totalParts}]` : ""}`,
    );
  }
}
