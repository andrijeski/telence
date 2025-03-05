const LOG_FILE = "./data/bot_logs.txt"; // Use relative path from project root

enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

// Generic logger function
async function log(
  level: LogLevel,
  message: string,
  error?: unknown,
): Promise<void> {
  const timestamp = new Date().toISOString();
  let logEntry = `[${timestamp}] [${level}] ${message}`;

  if (error instanceof Error) {
    logEntry += `\nStack Trace: ${error.stack}`;
  }

  logEntry += "\n";

  // Log to console
  console[level === LogLevel.ERROR ? "error" : "log"](logEntry);

  // Append to file
  try {
    await Deno.writeTextFile(LOG_FILE, logEntry, { append: true });
  } catch (fileError) {
    console.error(`Failed to write to log file: ${fileError.message}`);
  }
}

// Exported log functions
export async function logInfo(message: string): Promise<void> {
  await log(LogLevel.INFO, message);
}

export async function logWarn(message: string): Promise<void> {
  await log(LogLevel.WARN, message);
}

export async function logError(
  message: string,
  error?: unknown,
): Promise<void> {
  await log(LogLevel.ERROR, message, error);
}
