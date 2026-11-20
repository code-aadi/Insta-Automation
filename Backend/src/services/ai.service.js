import OpenAI from "openai";
import { buildSystemPrompt } from "../config/prompt.js";

const DEFAULT_FALLBACK_MESSAGE =
  "Thanks for your message! Hum jaldi aapko reply karenge.";

const KNOWN_PROVIDERS = {
  groq: {
    baseURL: "https://api.groq.com/openai/v1",
    defaultModels: [
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "qwen/qwen3.8-27b",
    ],
  },
  gemini: {
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    defaultModels: ["gemini-3.1-flash-lite", "gemini-3.5-flash"],
  },
  openai: {
    baseURL: "https://api.openai.com/v1",
    defaultModels: ["gpt-4o-mini"],
  },
  openrouter: {
    baseURL: "https://openrouter.ai/api/v1",
    defaultModels: ["openai/gpt-4o-mini"],
  },
};

const clientCache = new Map();

function getClient(baseURL, apiKey) {
  const cacheKey = `${baseURL}:${apiKey}`;
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey);
  }

  if (clientCache.size > 200) {
    clientCache.clear();
  }

  const client = new OpenAI({
    baseURL,
    apiKey,
    timeout: 15000,
    maxRetries: 0,
  });

  clientCache.set(cacheKey, client);
  return client;
}

function buildPipeline(aiProviders = []) {
  const pipeline = [];

  for (const item of aiProviders) {
    if (item.isActive === false || !item.apiKey) continue;

    const providerKey = item.provider?.toLowerCase();
    const known = KNOWN_PROVIDERS[providerKey];

    const baseURL = item.baseURL || known?.baseURL;
    const models =
      item.models?.length > 0 ? item.models : known?.defaultModels || [];

    if (!baseURL || models.length === 0) continue;

    const client = getClient(baseURL, item.apiKey);

    for (const model of models) {
      pipeline.push({
        name: `${providerKey || "custom"} (${model})`,
        client,
        model,
      });
    }
  }

  return pipeline;
}

const buildMessages = ({ history = [], userDetails, businessInfo }) => {
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

export const getReply = async ({
  history,
  userDetails,
  businessInfo,
  aiProviders = [],
  fallbackMessage = DEFAULT_FALLBACK_MESSAGE,
}) => {
  const pipeline = buildPipeline(aiProviders);

  if (pipeline.length === 0) {
    console.warn("[AI] No active AI providers/models configured for this account.");
    return { text: fallbackMessage, modelUsed: null, usage: null, isFallback: true };
  }

  const messages = buildMessages({ history, userDetails, businessInfo });

  if (messages.length <= 1) {
    return { text: fallbackMessage, modelUsed: null, usage: null, isFallback: true };
  }

  for (const { name, client, model } of pipeline) {
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
        const promptTokens = res.usage?.prompt_tokens || 0;
        const completionTokens = res.usage?.completion_tokens || 0;
        const totalTokens = res.usage?.total_tokens ?? promptTokens + completionTokens;

        console.log(
          `[AI] Success from ${name} | tokens: in=${promptTokens}, out=${completionTokens}`
        );

        return {
          text: reply,
          modelUsed: name,
          usage: { promptTokens, completionTokens, totalTokens },
          isFallback: false,
        };
      }

      console.warn(`[AI] ${name} gave empty reply, trying next...`);
    } catch (err) {
      console.error(`[AI] ${name} failed:`, err.status || "", err.message);
    }
  }

  return { text: fallbackMessage, modelUsed: null, usage: null, isFallback: true };
};