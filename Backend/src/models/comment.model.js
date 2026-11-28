import mongoose from "mongoose";
import { messageButtonSchema } from "./button.schema.js";

const commentRuleSchema = new mongoose.Schema(
  {
    botIgId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    targetMode: { type: String, enum: ["all", "specific"], default: "all" },
    mediaIds: { type: [String], default: [] },
    matchAll: { type: Boolean, default: false },
    keywords: { type: [String], default: [] },
    matchType: { type: String, enum: ["exact", "contains"], default: "contains" },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },

    // Stage 1 — one-shot private reply (ek comment par sirf ek baar)
    privateReply: {
      text: { type: String, default: "Access chahiye? Neeche button dabao 👇" },
      buttons: { type: [messageButtonSchema], default: [] },
    },
    // Stage 2 — follow confirm na hone par
    followGate: {
      text: { type: String, default: "Pehle follow karo, phir link milega ❤️" },
      profileUrl: { type: String, default: "" },
      confirmPayload: { type: String, default: "I_AM_FOLLOWING" },
    },
    // Stage 3 — follow confirmed, reward deliver
    reward: {
      text: { type: String, default: "Ye lo tumhara link! 🎉" },
      buttons: { type: [messageButtonSchema], default: [] },
    },

    stats: {
      matched: { type: Number, default: 0 },
      replied: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);
commentRuleSchema.index({ botIgId: 1, order: 1 });

const commentMediaSchema = new mongoose.Schema(
  {
    botIgId: { type: String, required: true },
    mediaId: { type: String, required: true },
    mediaType: { type: String, default: "IMAGE" },
    caption: { type: String, default: "" },
    thumbnailUrl: { type: String, default: "" },
    permalink: { type: String, default: "" },
    commentsCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    postedAt: Date,
    syncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
commentMediaSchema.index({ botIgId: 1, mediaId: 1 }, { unique: true });

const commentEventSchema = new mongoose.Schema(
  {
    botIgId: { type: String, required: true, index: true },
    commentId: { type: String, required: true, unique: true },
    mediaId: { type: String, default: "" },
    ruleId: { type: String, default: "" },
    ruleName: { type: String, default: "" },
    fromId: { type: String, default: "" },
    fromUsername: { type: String, default: "" },
    text: { type: String, default: "" },
    stage: {
      type: String,
      enum: ["matched", "private_replied", "awaiting_follow", "delivered", "denied", "failed"],
      default: "matched",
    },
    denyCount: { type: Number, default: 0 },
    privateReplyAt: Date,
    confirmAt: Date,
    deliveredAt: Date,
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
commentEventSchema.index({ botIgId: 1, timestamp: -1 });

export const CommentRule = mongoose.model("CommentRule", commentRuleSchema);
export const CommentMedia = mongoose.model("CommentMedia", commentMediaSchema);
export const CommentEvent = mongoose.model("CommentEvent", commentEventSchema);