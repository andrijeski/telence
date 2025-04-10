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

/**
 * Calculates the time difference between two timestamps and formats a system message
 * indicating the gap if it exceeds a given threshold.
 *
 * @param prevTimestamp ISO string of the previous message timestamp.
 * @param currentTimestamp ISO string of the current message timestamp.
 * @param thresholdSeconds The minimum difference in seconds to trigger formatting.
 * @returns A formatted system message string like "... X time passed ..." or null.
 */
export function formatTimeGapSystemMessage(
  prevTimestamp: string,
  currentTimestamp: string,
  thresholdSeconds: number,
): string | null {
  const prevDate = new Date(prevTimestamp);
  const currentDate = new Date(currentTimestamp);
  const diffSeconds = (currentDate.getTime() - prevDate.getTime()) / 1000;

  if (diffSeconds < thresholdSeconds) {
    return null;
  }

  let timeUnit: string;
  let timeValue: number;

  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) {
    timeValue = diffMinutes;
    timeUnit = `minute${diffMinutes > 1 ? "s" : ""}`;
  } else {
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      timeValue = diffHours;
      timeUnit = `hour${diffHours > 1 ? "s" : ""}`;
    } else {
      const diffDays = Math.round(diffHours / 24);
      timeValue = diffDays;
      timeUnit = `day${diffDays > 1 ? "s" : ""}`;
    }
  }

  // Using a simple format as requested. Can be customized further.
  return `... ${timeValue} ${timeUnit} passed between messages ...`;
}
