import { Context } from "https://deno.land/x/grammy@v1.20.0/mod.ts";
import { db } from "../database/db.ts";
import { fetchLLMResponse } from "../lib/providers.ts";
import { sendLongMessage } from "../utils/utils.ts";
import { logError, logInfo } from "../utils/logger.ts";

const MAX_MESSAGES = 100; // Set the limit

export async function handleSummaryCommand(ctx: Context) {
  try {
    const chatId = ctx.chat.id;
    logInfo(
      `User ${
        ctx.from?.username || "unknown"
      } requested /summary in chat ${chatId}`,
    );

    const args = ctx.message.text.split(" ");

    if (args.length < 2) {
      logError("Invalid /summary usage: missing argument.");
      await ctx.reply(
        "Usage: /summary <number of messages | time period (e.g., 1h)>",
      );
      return;
    }

    const param = args[1].trim();
    let summaryHistory: { role: string; content: string }[] = [];

    if (param.endsWith("h")) {
      const hours = parseFloat(param.slice(0, -1));
      if (isNaN(hours) || hours <= 0) {
        logError(`Invalid time format used: ${param}`);
        await ctx.reply(
          "Invalid time format. Use a positive number followed by 'h' (e.g., 1h).",
        );
        return;
      }

      const sinceTimestamp = new Date(Date.now() - hours * 60 * 60 * 1000)
        .toISOString();
      summaryHistory = db.queryMessages(chatId, MAX_MESSAGES).filter((msg) =>
        msg.timestamp >= sinceTimestamp
      );

      if (summaryHistory.length > MAX_MESSAGES) {
        logInfo(
          `Too many messages found (${summaryHistory.length}), limiting to ${MAX_MESSAGES}.`,
        );
        summaryHistory = summaryHistory.slice(-MAX_MESSAGES);
      }
    } else {
      let numMessages = parseInt(param);
      if (isNaN(numMessages) || numMessages <= 0) {
        logError(`Invalid message count: ${param}`);
        await ctx.reply(
          "Invalid number of messages. Use a positive number (e.g., /summary 20).",
        );
        return;
      }

      // Enforce the max message limit
      if (numMessages > MAX_MESSAGES) {
        logInfo(
          `Message limit exceeded: Requested ${numMessages}, limiting to ${MAX_MESSAGES}.`,
        );
        numMessages = MAX_MESSAGES;
      }

      summaryHistory = db.queryMessages(chatId, numMessages);
    }

    if (summaryHistory.length === 0) {
      logInfo(`No messages found for /summary in chat ${chatId}`);
      await ctx.reply("No messages found to summarize.");
      return;
    }

    logInfo(
      `Generating summary for ${summaryHistory.length} messages in chat ${chatId}`,
    );

    const systemPrompt = {
      role: "system",
      content:
        "You are a brilliant premium assistant with attention to details. Summarize the following Telegram conversation into bullet points. Each bullet point should represent a key topic or decision, focusing on the most valuable information.",
    };

    const summaryPrompt = [systemPrompt, ...summaryHistory];

    console.log("Summary prompt:", summaryPrompt);

    const summaryResponse = await fetchLLMResponse(summaryPrompt, chatId);
    await sendLongMessage(ctx, summaryResponse);

    logInfo(`Summary successfully sent to chat ${chatId}`);
  } catch (error) {
    logError("Error in handleSummaryCommand", error);
    await ctx.reply("An error occurred while processing the summary.");
  }
}
