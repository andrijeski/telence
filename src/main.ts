import {
  Bot,
  Context,
  session,
} from "https://deno.land/x/grammy@v1.20.0/mod.ts";
import { configEnv } from "./config/env.ts";
import { db } from "./database/db.ts";
import { ChatMessage, fetchLLMResponse } from "./lib/providers.ts"; // Import ChatMessage
import { logError, logInfo } from "./utils/logger.ts";
import { handleSummaryCommand } from "./commands/commands.ts";
import { formatTimeGapSystemMessage, sendLongMessage } from "./utils/utils.ts"; // Use formatTimeGapSystemMessage

const bot = new Bot<Context>(configEnv.TELEGRAM_BOT_TOKEN);
bot.use(session());

let isShuttingDown = false;

// Graceful Shutdown Handler
function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logInfo("Shutting down Telence bot...");
  console.log("Shutting down Telence bot...");

  try {
    db.close();
    console.log("Database connection closed.");
  } catch (error) {
    logError("Error closing database during shutdown", error);
  }

  console.log("Bot stopped.");
  Deno.exit();
}

// Capture shutdown signals
Deno.addSignalListener("SIGINT", shutdown);
Deno.addSignalListener("SIGTERM", shutdown);

bot.command(
  "start",
  (ctx: Context) => ctx.reply("Hello! I'm your AI bot. Ask me anything!"),
);
bot.command("summary", handleSummaryCommand);

bot.command("reset", async (ctx: Context) => {
  const chatId = ctx.chat.id;
  try {
    db.deleteMessages(chatId); // Use the new method
    await ctx.reply("Memory has been reset for this chat.");
    logInfo(`Cleared conversation history for chat ${chatId}`);
  } catch (error: any) { // Add type annotation
    await logError(
      `Failed to clear memory for chat ${chatId}: ${error.message}`,
    );
    await ctx.reply("Failed to reset memory. Please try again later.");
  }
});

bot.on("message:text", async (ctx: Context) => {
  if (isShuttingDown) return;

  const chatId = ctx.chat.id;
  db.insertMessage(
    chatId,
    ctx.message.from.id,
    ctx.message.from.username,
    ctx.message.text,
    new Date().toISOString(),
  );

  if (
    (ctx.chat.type === "group" || ctx.chat.type === "supergroup") &&
    !ctx.message.text.includes("@" + ctx.me.username)
  ) {
    return;
  }

  console.log(`Received message in ${ctx.chat.type}: "${ctx.message.text}"`);

  // Retrieve raw history
  const rawHistory = db.queryMessages(chatId, configEnv.CONTEXT_SIZE);

  // Process history to insert time gap system messages conditionally
  const processedHistory: ChatMessage[] = [];
  for (let i = 0; i < rawHistory.length; i++) {
    const currentMsg = rawHistory[i];
    // Check if there's a previous message to compare with
    if (i > 0) {
      const prevMsg = rawHistory[i - 1];
      const timeGapMessage = formatTimeGapSystemMessage(
        prevMsg.timestamp,
        currentMsg.timestamp,
        configEnv.RELATIVE_TIME_THRESHOLD_SECONDS!, // Use configured threshold
      );
      // If threshold met, insert the system message BEFORE the current message
      if (timeGapMessage) {
        processedHistory.push({ role: "system", content: timeGapMessage });
      }
    }
    // Add the actual message (user or assistant)
    processedHistory.push({
      role: currentMsg.role as "user" | "assistant", // Cast role
      content: currentMsg.content,
    });
  }

  const systemPrompt: ChatMessage = {
    role: "system",
    content: `You are ${configEnv.BOT_NAME}, a friendly and intelligent Telegram bot integrated into group and private chats. In group chats, you respond only when explicitly mentioned (e.g., '@${configEnv.BOT_NAME}'). You are powered by a PREMIUM large language model and have access to the last ${configEnv.CONTEXT_SIZE} messages of the conversation, including both user messages and your own previous responses. Use this context to generate helpful, accurate, and context-aware answers. **To ensure clarity and direct communication, always tag users by their Telegram username (e.g., @username) when referring to them in your responses.** Always keep the conversation natural and engaging, but keep it cool. Don't add timestamps to the messages unless you're asked to do so (they are for your reference only).`,
  };

  const finalHistory = [systemPrompt, ...processedHistory]; // Use processed history

  console.log("finalHistory:", finalHistory);

  try {
    const [aiResponse] = await Promise.all([
      fetchLLMResponse(finalHistory), // Removed chatId argument
    ]);

    await sendLongMessage(ctx, aiResponse);
    db.insertMessage(
      chatId,
      0,
      ctx.me.username,
      aiResponse,
      new Date().toISOString(),
    );
  } catch (error: any) { // Add type annotation
    logError("Error processing message", error);
  }
});

bot.start().then(() => {
  logInfo("Telence bot started successfully.");
  console.log("Telence bot is up and running!");
}).catch((error: any) => { // Add type annotation
  logError("Telence bot failed to start!", error);
});
