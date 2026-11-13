import "dotenv/config";

const PIPELINE = [
  { name: "Groq (gpt-oss-120b)",     baseURL: "https://api.groq.com/openai/v1", key: process.env.GROQ_API_KEY,   model: "openai/gpt-oss-120b" },
  { name: "Groq (gpt-oss-20b)",      baseURL: "https://api.groq.com/openai/v1", key: process.env.GROQ_API_KEY,   model: "openai/gpt-oss-20b" },
  { name: "Groq (qwen3.8-27b)",      baseURL: "https://api.groq.com/openai/v1", key: process.env.GROQ_API_KEY,   model: "qwen/qwen3.8-27b" },
  { name: "Gemini (3.5-flash-lite)", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", key: process.env.GEMINI_API_KEY, model: "gemini-3.5-flash-lite" },
  { name: "Gemini (3.5-flash)",      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", key: process.env.GEMINI_API_KEY, model: "gemini-3.5-flash" },
];

const rows = [];

for (const { name, baseURL, key, model } of PIPELINE) {
  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 16,
      }),
    });

    const h = (k) => res.headers.get(k) ?? "-";

    // Jo bhi x-ratelimit headers aaye, sab collect karo
    const rateHeaders = [...res.headers.entries()].filter(([k]) =>
      k.toLowerCase().startsWith("x-ratelimit")
    );

    rows.push({
      Model: name,
      Status: res.status,
      "Req/din (limit)": h("x-ratelimit-limit-requests"),
      "Req/din (bacha)": h("x-ratelimit-remaining-requests"),
      "Tokens/min (limit)": h("x-ratelimit-limit-tokens"),
      "Tokens/min (bacha)": h("x-ratelimit-remaining-tokens"),
      "Reset (req)": h("x-ratelimit-reset-requests"),
      Note: rateHeaders.length === 0 ? "limit headers nahi mile" : "",
    });
  } catch (err) {
    rows.push({ Model: name, Status: "ERROR", Note: err.message });
  }
}

console.table(rows);