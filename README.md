# Telence - Telegram LLM Bot

Telence is a Telegram bot that integrates with large language models (LLMs) to
provide contextual, AI-powered responses in group and private chats. It supports
multiple LLM providers (OpenAI and Gemini) and leverages conversation history
stored in an SQLite database to generate more informed and context-aware
answers.

## Why Telence?

Telence is designed for **seamless Telegram AI interaction**, allowing users to chat naturally with a bot that can store conversation history and generate concise summaries. It supports **multiple LLM providers (OpenAI, Gemini, and more planned)**, making it flexible and future-proof.

Built with **Deno**, it offers a lightweight, secure, and efficient alternative to other chatbot frameworks.

## Features

- **Multi-LLM Support:**\
  Easily switch between OpenAI and Google Gemini models using environment
  variables.
- **Context-Aware Responses:**\
  Stores conversation history in an SQLite database. Retrieves both user and bot
  messages in chronological order to provide context for generating replies.
- **Selective Group Chat Responses:**\
  In group chats, the bot responds only when explicitly mentioned (e.g.,
  `@pjer_bot`).
- **Commands:**
  - `/start` – Greets the user.
  - `/reset` – Clears the conversation history (memory reset) for the current
    chat.
  - `/summary <param>` – Generates a summary of recent messages. The parameter
    can either be a number (e.g., `/summary 20` for the last 20 messages) or a
    time period (e.g., `/summary 1h` for messages from the last hour).
- **Logging & Debugging:**\
  Logs errors and API interactions to `bot_logs.txt` for troubleshooting.

## Technologies Used

- **Deno:**\
  A modern, secure runtime for JavaScript and TypeScript.
- **grammY:**\
  A powerful Telegram Bot framework for Deno.
- **SQLite:**\
  Used for storing chat history and metadata.
- **LLM Providers:**\
  Integrates with OpenAI and Google Gemini for generating AI-powered responses.

## Setting Up Your Telegram Bot  
To create a new bot, follow the [Telegram BotFather guide](https://core.telegram.org/bots#botfather) to generate an API key.

## Setup & Installation

1. **Clone the Repository:**

   ```
   git clone https://github.com/andrijeski/telence.git
   cd telence
   ```

2. **Configure Environment Variables:**

Create a .env file and define the following variables:

    TELEGRAM_BOT_TOKEN=your_telegram_bot_token
    OPENAI_API_KEY=your_openai_api_key
    GEMINI_API_KEY=your_gemini_api_key
    LLM_PROVIDER=openai    # Supported providers: openai, gemini (more planned)
    MODEL_NAME=chatgpt-4o-latest
    CONTEXT_SIZE=10        # Adjustable context size (number of messages)

3. **Run the bot:**

Use Deno to run the bot with the required permissions:

    deno task start

(The bot's entry point is located at `src/main.ts`)

## Usage

- **Start a Chat:**\
  Send `/start` to get a greeting and basic instructions.
- **Interacting in Group Chats:**\
  In a group chat, mention the bot (e.g., `@pjer_bot`) for it to respond.
- **Resetting Conversation Memory:**\
  Use the `/reset` command to clear all stored messages for the current chat.
- **Summarizing Conversation:**
  - **By Number of Messages:**\
    `/summary 20` will summarize the last 20 messages.
  - **By Time Period:**\
    `/summary 1h` will summarize all messages from the past hour.

## Development

- **TypeScript Configuration:**\
  The project uses a `tsconfig.json` file with modern settings:

  ```
  {
    "compilerOptions": {
      "lib": ["ESNext", "DOM"],
      "module": "ESNext",
      "target": "ESNext",
      "strict": true,
      "noImplicitReturns": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true,
      "allowJs": false,
      "noFallthroughCasesInSwitch": true
    }
  }
  ```

- **Package Management:** Basic project metadata, scripts, and import maps are managed via deno.json. Deno automatically handles dependencies, but if needed, deno.lock can be used to ensure version consistency.

## Planned Improvements

- **Memory Optimization**: Summarizing older chat history to keep token costs low while maintaining context.
- **Vector Database Support**: Implementing memory recall using Pinecone or similar for long-term knowledge retention.
- **More LLM Providers**: Expanding support beyond OpenAI and Gemini (DeepSeek, Claude, etc.).

### Frameworks & APIs  
- [grammY (Telegram Bot Framework)](https://github.com/grammyjs/grammY)  
- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)  
- [OpenAI API](https://platform.openai.com/docs/)  
- [Google Gemini API](https://ai.google.dev)  

## More Resources  
- [Deno Documentation](https://deno.land/manual)  
- [grammY Telegram Bot Framework](https://grammy.dev)  
- [SQLite for Deno](https://deno.land/x/sqlite)  
