import OpenAI from "openai";
import { buildSystemPrompt } from "../config/prompt.js";
import { filterChatModels } from "../helper/filterChatModels.js";

const DEFAULT_FALLBACK_MESSAGE =
  "Thanks for your message! Hum jaldi aapko reply karenge.";

export const KNOWN_PROVIDERS = {
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
         key: `${baseURL}:${model}`,
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

// ---------- Circuit Breaker: fail hue models ko kuch der skip karo ----------
const modelHealth = new Map(); // key → { until, status }

const COOLDOWN_BY_STATUS = {
  404: 60 * 60 * 1000, // model deprecated/gone → 1 ghanta
  400: 30 * 60 * 1000, // bad request / unsupported param → 30 min
  401: 30 * 60 * 1000, // invalid key → 30 min
  403: 30 * 60 * 1000, // permission denied → 30 min
  429: 60 * 1000,      // rate limit → 1 min
  500: 60 * 1000,      // server error → 1 min
  502: 60 * 1000,
  503: 2 * 60 * 1000,  // high traffic / overloaded → 2 min
  504: 60 * 1000,
};

function isModelCooling(key) {
  const rec = modelHealth.get(key);
  if (!rec) return false;
  if (Date.now() >= rec.until) {
    modelHealth.delete(key);
    return false;
  }
  return true;
}

function markModelFailed(key, status) {
  const ms = COOLDOWN_BY_STATUS[status] || 0; // network/timeout → cooldown nahi
  if (!ms) return;
  modelHealth.set(key, { until: Date.now() + ms, status });
}

function markModelHealthy(key) {
  modelHealth.delete(key);
}

// Expired records saaf karo (memory leak na ho)
setInterval(() => {
  const now = Date.now();
  for (const [k, rec] of modelHealth) {
    if (now >= rec.until) modelHealth.delete(k);
  }
}, 10 * 60 * 1000).unref();


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

  // Cooldown wale models skip karo
  const available = pipeline.filter((entry) => !isModelCooling(entry.key));
  const candidates = available.length > 0 ? available : pipeline;

  if (available.length === 0) {
    // Sab cooling mein hain -> chup rehne se better hai try kar lena
    console.warn("[AI] All models in cooldown — trying anyway");
  } else if (available.length < pipeline.length) {
    console.log(
      `[AI] Skipping ${pipeline.length - available.length} model(s) in cooldown`
    );
  }

  for (const { name, client, model, key } of candidates) {
    try {
      console.log(`[AI] Trying ${name}...`);

      const res = await client.chat.completions.create({
        model,
        messages,
        max_tokens: 500,
        temperature: 0.8,
        ...(model.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
      });

      const reply = res.choices?.[0]?.message?.content?.trim();

      if (reply) {
        markModelHealthy(key); // kaam kar gaya -> notebook se naam hatao

        const promptTokens = res.usage?.prompt_tokens || 0;
        const completionTokens = res.usage?.completion_tokens || 0;
        const totalTokens =
          res.usage?.total_tokens ?? promptTokens + completionTokens;

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
      markModelFailed(key, err.status); // fail -> notebook mein likh do
      console.error(`[AI] ${name} failed:`, err.status || "", err.message);
    }
  }

  return { text: fallbackMessage, modelUsed: null, usage: null, isFallback: true };
};




export const fetchProviderModels = async ({ provider, baseURL, apiKey }) => {
  const url =
    provider === "custom" ? baseURL : KNOWN_PROVIDERS[provider].baseURL;
  const cleanUrl = url.replace(/\/+$/, "");

  const response = await fetch(`${cleanUrl}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15000),
  });

  // HTML error page par .json() crash na ho
  let apiResponse;
  try {
    apiResponse = await response.json();
  } catch {
    throw new Error(
      `Provider ne invalid response bheja (HTTP ${response.status}). Base URL check karo.`
    );
  }

  if (!response.ok) {
    // 401/403 yahan khatam — controller tak status nahi jaayega (auto-logout trap)
    if (response.status === 401 || response.status === 403) {
      throw new Error("Invalid API key");
    }
    throw new Error(
      apiResponse?.error?.message ||
        `Failed to fetch models (HTTP ${response.status})`
    );
  }

  if (!Array.isArray(apiResponse?.data)) {
    throw new Error("Provider se models list nahi mili — unexpected response");
  }

  return filterChatModels(apiResponse);
};

