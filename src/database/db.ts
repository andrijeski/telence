import { DB } from "https://deno.land/x/sqlite/mod.ts";

const DB_PATH = "./data/chat_history.db";

class Database {
  private static instance: Database;
  private db: DB;

  private constructor() {
    this.db = new DB(DB_PATH);

    // Initialize tables
    this.setupTables();
  }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private setupTables() {
    try {
      this.db.query(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER,
        user_id INTEGER,
        username TEXT,
        message TEXT,
        timestamp TEXT
      )`);

      this.db.query(`CREATE TABLE IF NOT EXISTS metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER,
        user_id INTEGER,
        tokens_used INTEGER,
        model TEXT,
        timestamp TEXT
      )`);

      this.db.query(`CREATE INDEX IF NOT EXISTS idx_messages_chat_id_timestamp 
        ON messages (chat_id, timestamp)`);
    } catch (error) {
      console.error("Database setup error:", error);
    }
  }

  insertMessage(
    chatId: number,
    userId: number,
    username: string,
    message: string,
    timestamp: string,
  ) {
    try {
      this.db.query(
        "INSERT INTO messages (chat_id, user_id, username, message, timestamp) VALUES (?, ?, ?, ?, ?)",
        [chatId, userId, username, message, timestamp],
      );
    } catch (error) {
      console.error("Error inserting message:", error);
    }
  }

  queryMessages(
    chatId: number,
    contextSize: number,
  ): Array<{ role: string; content: string; timestamp: string }> {
    try {
      return this.db.query<[number, string, string, string]>( // Add type argument for query result
        "SELECT user_id, username, message, timestamp FROM messages WHERE chat_id = ? ORDER BY timestamp DESC LIMIT ?",
        [chatId, contextSize],
      ).map((row: [number, string, string, string]) => { // Add type annotation for row
        const userId = row[0];
        const username = row[1];
        const message = row[2];
        const timestamp = row[3];
        return {
          role: userId === 0 ? "assistant" : "user",
          content: userId === 0 ? message : `${username}: ${message}`,
          timestamp,
        };
      }).reverse();
    } catch (error) {
      console.error("Error querying messages:", error);
      return [];
    }
  }

  deleteMessages(chatId: number): void {
    try {
      this.db.query("DELETE FROM messages WHERE chat_id = ?", [chatId]);
    } catch (error) {
      console.error(`Error deleting messages for chat ${chatId}:`, error);
      // Optionally re-throw or handle more gracefully
    }
  }

  close(): void {
    try {
      this.db.close();
    } catch (error) {
      console.error("Error closing database:", error);
    }
  }
}

// Export singleton instance
export const db = Database.getInstance();
