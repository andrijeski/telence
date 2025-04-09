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
 * Formats a date object into YYYY-MM-DD HH:MM format.
 * @param date The Date object to format.
 * @returns The formatted date string.
 */
function formatAbsoluteDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Calculates the relative time difference between two timestamps and formats it
 * if it exceeds a given threshold.
 *
 * @param prevTimestamp ISO string of the previous message timestamp.
 * @param currentTimestamp ISO string of the current message timestamp.
 * @param thresholdSeconds The minimum difference in seconds to trigger formatting.
 * @returns A formatted string like "(X time ago; YYYY-MM-DD HH:MM)" or null.
 */
export function formatRelativeTime(
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

  const absoluteTime = formatAbsoluteDateTime(currentDate);
  let relativeTime: string;

  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) {
    relativeTime = `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  } else {
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      relativeTime = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    } else {
      const diffDays = Math.round(diffHours / 24);
      // Check if it was actually "Yesterday"
      const yesterday = new Date(currentDate);
      yesterday.setDate(currentDate.getDate() - 1);
      if (
        diffDays === 1 &&
        prevDate.getFullYear() === yesterday.getFullYear() &&
        prevDate.getMonth() === yesterday.getMonth() &&
        prevDate.getDate() === yesterday.getDate()
      ) {
        relativeTime = "Yesterday";
      } else {
        relativeTime = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
      }
    }
  }

  return `(${relativeTime}; ${absoluteTime})`;
}
