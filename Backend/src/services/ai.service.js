import "dotenv/config";
import OpenAI from "openai";
import { buildSystemPrompt } from "../config/prompt.js";

// 1. Groq Client
const groqClient = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
  timeout: 15000,
  maxRetries: 0,
});

// 2. Gemini Client (OpenAI SDK Compatible)
const geminiClient = new OpenAI({
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  apiKey: process.env.GEMINI_API_KEY,
  timeout: 15000,
  maxRetries: 0,
});


const MODEL_PIPELINE = [
  { name: "Groq (gpt-oss-120b)",      client: groqClient,   model: "openai/gpt-oss-120b" },
  { name: "Groq (gpt-oss-20b)",       client: groqClient,   model: "openai/gpt-oss-20b" },
  { name: "Groq (qwen3.8-27b)",       client: groqClient,   model: "qwen/qwen3.8-27b" },
  { name: "Gemini (3.1-flash-lite)",  client: geminiClient, model: "gemini-3.1-flash-lite" },
  { name: "Gemini (3.5-flash)",       client: geminiClient, model: "gemini-3.5-flash" },
];
const FALLBACK_MESSAGE = "Thanks for your message! Hum jaldi aapko reply karenge.";

const buildMessages = ({ history, userDetails, businessInfo }) => {
  return [
    { role: "system", content: buildSystemPrompt({ businessInfo, userDetails }) },
    ...history
      .filter((message) => message.text)
      .map((message) => ({
        role: message.direction === "incoming" ? "user" : "assistant",
        content: message.text,
      })),
  ];
};

export const getReply = async (data) => {
  const messages = buildMessages(data);

  for (const { name, client, model } of MODEL_PIPELINE) {
    try {
      console.log(`[AI] Trying ${name}...`);

      const res = await client.chat.completions.create({
        model,
        messages,
        max_tokens: 500,
        temperature: 0.8,
      });

      const reply = res.choices?.[0]?.message?.content?.trim();

      if (reply) {
        console.log(
          `[AI] Success from ${name} | tokens: in=${res.usage?.prompt_tokens}, out=${res.usage?.completion_tokens}`
        );
        return reply;
      }

      console.warn(`[AI] ${name} gave empty reply, trying next...`);
    } catch (err) {
      console.error(`[AI] ${name} failed:`, err.status || "", err.message);
    }
  }

  return FALLBACK_MESSAGE;
};







