import mongoose from "mongoose";

export const messageButtonSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["web_url", "postback"],
      default: "web_url",
    },
    title: { type: String, required: true, trim: true, maxlength: 20 },
    url: { type: String, trim: true },
    payload: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: false }
);

export function cleanButtons(input, max = 3) {
  if (!Array.isArray(input)) return [];
  return input
    .slice(0, max)
    .map((b) => ({
      type: b?.type === "postback" ? "postback" : "web_url",
      title: String(b?.title || "").trim().slice(0, 20),
      url: String(b?.url || "").trim(),
      payload: String(b?.payload || "").trim().slice(0, 1000),
    }))
    .filter((b) => b.title);
}