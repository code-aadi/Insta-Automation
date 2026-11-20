import mongoose from "mongoose";

const keywordRuleSchema = new mongoose.Schema({
  keywords: {
    type: [String], // e.g., ["price", "cost", "fees"]
    required: true,
  },
  matchType: {
    type: String,
    enum: ["exact", "contains"],
    default: "contains",
  },
  reply: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const aiProviderSchema = new mongoose.Schema({
  provider: {
    type: String, // e.g., "groq", "gemini", "openai", "openrouter", "custom"
    required: true,
    lowercase: true,
    trim: true,
  },
  baseURL: {
    type: String, // Built-in providers ke liye optional, "custom" ke liye required
    trim: true,
  },
  apiKey: {
    type: String,
    required: true,
    select: false,
  },
  models: {
    type: [String], // e.g., ["gpt-4o-mini"] ya ["llama-3.3-70b-versatile"]
    default: [],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

const accountSchema = new mongoose.Schema(
  {
    botIgId: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      trim: true,
    },

    // Instagram Graph API Token (Encrypted save hoga)
    accessToken: {
      type: String,
      required: true,
      select: false,
    },
    tokenExpiresAt: Date,

    // BYOK: Client ke AI providers & models (fallback order mein)
    aiProviders: {
      type: [aiProviderSchema],
      default: [],
    },

    // Client ki Business Details (AI / Hybrid mode ke liye)
    businessInfo: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      description: {
        type: String,
        default: "",
      },
      customInstructions: {
        type: String,
        default: "",
      },
      customSystemPrompt: {
        type: String,
        default: "",
      },
    },

    // Keyword -> Fixed Reply Rules (Rules / Hybrid mode ke liye)
    keywordRules: {
      type: [keywordRuleSchema],
      default: [],
    },

    // Client-wise Bot Settings
    settings: {
      isActive: {
        type: Boolean,
        default: true,
      },
      botMode: {
        type: String,
        enum: ["ai", "rules", "hybrid"],
        default: "hybrid",
      },
      requireFollow: {
        type: Boolean,
        default: true,
      },
      followMessage: {
        type: String,
        default: "Please follow first then we talk! 😊",
      },
      // Sirf "rules" mode mein jab koi keyword match na ho (khali chhodo agar chup rehna ho)
      noMatchReply: {
        type: String,
        default: "",
      },
      fallbackMessage: {
        type: String,
        default: "Thanks for your message! Hum jaldi aapko reply karenge.",
      },
      replyDelaySeconds : {
        type : Number,
        default : 3,
        min : 0,
        max : 15
      }
    },
  },
  {
    timestamps: true,
  }
);

export const Account = mongoose.model("Account", accountSchema);