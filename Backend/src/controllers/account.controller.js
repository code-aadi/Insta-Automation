import { Account } from "../models/account.model.js";
import { User } from "../models/user.model.js";
import { Message } from "../models/message.model.js";
import { encrypt } from "../helper/crypto.js";
import { generateConversationId } from "../helper/conversationId.js";
import { refreshAccountToken } from "../services/auth.service.js";
import { fetchProviderModels, KNOWN_PROVIDERS } from "../services/ai.service.js";
function sanitizeAccount(account) {
  if (!account) return null;
  const obj = typeof account.toObject === "function" ? account.toObject() : { ...account };

  delete obj.accessToken;

  if (Array.isArray(obj.aiProviders)) {
    obj.aiProviders = obj.aiProviders.map(({ apiKey, ...rest }) => ({
      ...rest,
      hasApiKey: Boolean(apiKey),
    }));
  }

  return obj;
}

// 1. Apna account data fetch karo
export const getMyAccount = async (req, res) => {
  try {
    const account = await Account.findOne({ botIgId: req.botIgId })
      .select("+aiProviders.apiKey")
      .lean();

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    return res.json({ account: sanitizeAccount(account) });
  } catch (error) {
    console.error("getMyAccount Error:", error.message);
    return res.status(500).json({ error: "Failed to fetch account" });
  }
};

// 2. Business Info update karo
export const updateBusinessInfo = async (req, res) => {
  try {
    const { name, description, customInstructions, customSystemPrompt } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ error: "Business name cannot be empty" });
      }
      updates["businessInfo.name"] = String(name).trim();
    }
    if (description !== undefined) updates["businessInfo.description"] = description;
    if (customInstructions !== undefined) updates["businessInfo.customInstructions"] = customInstructions;
    if (customSystemPrompt !== undefined) updates["businessInfo.customSystemPrompt"] = customSystemPrompt;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const account = await Account.findOneAndUpdate(
      { botIgId: req.botIgId },
      { $set: updates },
      { new: true, runValidators: true }
    ).select("+aiProviders.apiKey");

    return res.json({ account: sanitizeAccount(account) });
  } catch (error) {
    console.error("updateBusinessInfo Error:", error.message);
    return res.status(400).json({ error: error.message });
  }
};

// 3. Bot Settings update karo (ON/OFF, botMode, follow gate, etc.)
export const updateSettings = async (req, res) => {
  try {
    const {
      isActive,
      botMode,
      requireFollow,
      followMessage,
      noMatchReply,
      fallbackMessage,
      replyDelaySeconds,
      followReminderCooldownHours
    } = req.body;

    const updates = {};
    if (replyDelaySeconds !== undefined) {
  const parsed = Number(replyDelaySeconds);
  if (
    replyDelaySeconds === "" ||
    replyDelaySeconds === null ||
    typeof replyDelaySeconds === "boolean" ||
    !Number.isFinite(parsed)
  ) {
    return res.status(400).json({ error: "replyDelaySeconds must be a valid number" });
  }
  updates["settings.replyDelaySeconds"] = parsed;
}

if (followReminderCooldownHours !== undefined) {
  const parsed = Number(followReminderCooldownHours);
  if (
    followReminderCooldownHours === "" ||
    followReminderCooldownHours === null ||
    typeof followReminderCooldownHours === "boolean" ||
    !Number.isFinite(parsed)
  ) {
    return res
      .status(400)
      .json({ error: "followReminderCooldownHours must be a valid number" });
  }
  updates["settings.followReminderCooldownHours"] = parsed;
}


    if (isActive !== undefined) updates["settings.isActive"] = Boolean(isActive);
    if (botMode !== undefined) updates["settings.botMode"] = botMode;
    if (requireFollow !== undefined) updates["settings.requireFollow"] = Boolean(requireFollow);
    if (followMessage !== undefined) updates["settings.followMessage"] = followMessage;
    if (noMatchReply !== undefined) updates["settings.noMatchReply"] = noMatchReply;
    if (fallbackMessage !== undefined) updates["settings.fallbackMessage"] = fallbackMessage;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const account = await Account.findOneAndUpdate(
      { botIgId: req.botIgId },
      { $set: updates },
      { new: true, runValidators: true }
    ).select("+aiProviders.apiKey");

    return res.json({ account: sanitizeAccount(account) });
  } catch (error) {
    console.error("updateSettings Error:", error.message);
    return res.status(400).json({ error: error.message });
  }
};

// 4. Keyword Rule Add karo
export const addKeywordRule = async (req, res) => {
  try {
    const { keywords, matchType = "contains", reply, isActive = true } = req.body;

    if (!Array.isArray(keywords) || keywords.length === 0 || !reply?.trim()) {
      return res.status(400).json({ error: "keywords array and reply are required" });
    }

    const cleanKeywords = keywords.map((k) => String(k).trim()).filter(Boolean);
    if (cleanKeywords.length === 0) {
      return res.status(400).json({ error: "At least one valid keyword is required" });
    }

    const account = await Account.findOneAndUpdate(
      { botIgId: req.botIgId },
      {
        $push: {
          keywordRules: { keywords: cleanKeywords, matchType, reply, isActive },
        },
      },
      { new: true, runValidators: true }
    ).select("+aiProviders.apiKey");

    return res.status(201).json({ account: sanitizeAccount(account) });
  } catch (error) {
    console.error("addKeywordRule Error:", error.message);
    return res.status(400).json({ error: error.message });
  }
};

// 5. Keyword Rule Edit / Toggle karo
export const updateKeywordRule = async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { keywords, matchType, reply, isActive } = req.body;

    const updates = {};
    if (keywords !== undefined) {
      const cleanKeywords = Array.isArray(keywords)
        ? keywords.map((k) => String(k).trim()).filter(Boolean)
        : [];
      if (cleanKeywords.length === 0) {
        return res.status(400).json({ error: "keywords must be a non-empty array" });
      }
      updates["keywordRules.$.keywords"] = cleanKeywords;
    }
    if (matchType !== undefined) updates["keywordRules.$.matchType"] = matchType;
    if (reply !== undefined) updates["keywordRules.$.reply"] = reply;
    if (isActive !== undefined) updates["keywordRules.$.isActive"] = Boolean(isActive);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const account = await Account.findOneAndUpdate(
      { botIgId: req.botIgId, "keywordRules._id": ruleId },
      { $set: updates },
      { new: true, runValidators: true }
    ).select("+aiProviders.apiKey");

    if (!account) {
      return res.status(404).json({ error: "Keyword rule not found" });
    }

    return res.json({ account: sanitizeAccount(account) });
  } catch (error) {
    console.error("updateKeywordRule Error:", error.message);
    return res.status(400).json({ error: error.message });
  }
};

// 6. Keyword Rule Delete karo
export const deleteKeywordRule = async (req, res) => {
  try {
    const { ruleId } = req.params;

    const account = await Account.findOneAndUpdate(
      { botIgId: req.botIgId },
      { $pull: { keywordRules: { _id: ruleId } } },
      { new: true }
    ).select("+aiProviders.apiKey");

    return res.json({ account: sanitizeAccount(account) });
  } catch (error) {
    console.error("deleteKeywordRule Error:", error.message);
    return res.status(400).json({ error: error.message });
  }
};

// 7. AI Provider Add karo (API key encrypt hoke save hogi)
export const addAiProvider = async (req, res) => {
  try {
    const { provider, baseURL, apiKey, models = [], isActive = true } = req.body;

    if (!provider?.trim() || !apiKey?.trim()) {
      return res.status(400).json({ error: "provider and apiKey are required" });
    }
    if (provider.toLowerCase() === "custom" && !baseURL?.trim()) {
      return res.status(400).json({ error: "baseURL is required for custom provider" });
    }

    const account = await Account.findOneAndUpdate(
      { botIgId: req.botIgId },
      {
        $push: {
          aiProviders: {
            provider: provider.trim().toLowerCase(),
            baseURL: baseURL?.trim() || undefined,
            apiKey: encrypt(apiKey.trim()),
            models: Array.isArray(models)
              ? models.map((m) => String(m).trim()).filter(Boolean)
              : [],
            isActive: Boolean(isActive),
          },
        },
      },
      { new: true, runValidators: true }
    ).select("+aiProviders.apiKey");

    return res.status(201).json({ account: sanitizeAccount(account) });
  } catch (error) {
    console.error("addAiProvider Error:", error.message);
    return res.status(400).json({ error: error.message });
  }
};

// 8. AI Provider Update karo
export const updateAiProvider = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { provider, baseURL, apiKey, models, isActive } = req.body;

    const updates = {};
    if (provider !== undefined) updates["aiProviders.$.provider"] = provider.trim().toLowerCase();
    if (baseURL !== undefined) updates["aiProviders.$.baseURL"] = baseURL;
    if (apiKey?.trim()) updates["aiProviders.$.apiKey"] = encrypt(apiKey.trim());
    if (models !== undefined) {
      updates["aiProviders.$.models"] = Array.isArray(models)
        ? models.map((m) => String(m).trim()).filter(Boolean)
        : [];
    }
    if (isActive !== undefined) updates["aiProviders.$.isActive"] = Boolean(isActive);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const account = await Account.findOneAndUpdate(
      { botIgId: req.botIgId, "aiProviders._id": providerId },
      { $set: updates },
      { new: true, runValidators: true }
    ).select("+aiProviders.apiKey");

    if (!account) {
      return res.status(404).json({ error: "AI provider not found" });
    }

    return res.json({ account: sanitizeAccount(account) });
  } catch (error) {
    console.error("updateAiProvider Error:", error.message);
    return res.status(400).json({ error: error.message });
  }
};

// 9. AI Provider Delete karo
export const deleteAiProvider = async (req, res) => {
  try {
    const { providerId } = req.params;

    const account = await Account.findOneAndUpdate(
      { botIgId: req.botIgId },
      { $pull: { aiProviders: { _id: providerId } } },
      { new: true }
    ).select("+aiProviders.apiKey");

    return res.json({ account: sanitizeAccount(account) });
  } catch (error) {
    console.error("deleteAiProvider Error:", error.message);
    return res.status(400).json({ error: error.message });
  }
};

// 10. Dashboard Analytics Stats (DB se)
export const getDashboardStats = async (req, res) => {
  try {
    const botIgId = req.botIgId;

    const [totalUsers, followersCount, incomingMessages, outgoingMessages] =
      await Promise.all([
        User.countDocuments({ botIgId }),
        User.countDocuments({ botIgId, isFollowing: true }),
        Message.countDocuments({ botIgId, direction: "incoming" }),
        Message.countDocuments({ botIgId, direction: "outgoing" }),
      ]);

    return res.json({
      stats: {
        totalUsers,
        followersCount,
        incomingMessages,
        outgoingMessages,
      },
    });
  } catch (error) {
    console.error("getDashboardStats Error:", error.message);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
};

// 11. Client ke Leads / Followers list
export const getLeads = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({ botIgId: req.botIgId })
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({ botIgId: req.botIgId }),
    ]);

    return res.json({ users, page, limit, total });
  } catch (error) {
    console.error("getLeads Error:", error.message);
    return res.status(500).json({ error: "Failed to fetch leads" });
  }
};


export const getConversationMessages = async (req, res) => {
  try {
    const { instagramId } = req.params;
    const conversationId = generateConversationId(instagramId, req.botIgId);

    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));

   
    const messages = await Message.find({ conversationId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    const hasMore = messages.length === limit;

    return res.json({ messages: messages.reverse(), hasMore });
  } catch (error) {
    console.error("getConversationMessages Error:", error.message);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
};

// 13. Instagram long-lived token manually refresh karo
export const refreshToken = async (req, res) => {
  try {
    const { tokenExpiresAt } = await refreshAccountToken(req.botIgId);

    const account = await Account.findOne({ botIgId: req.botIgId })
      .select("+aiProviders.apiKey")
      .lean();

    return res.json({ account: sanitizeAccount(account), tokenExpiresAt });
  } catch (error) {
    console.error("refreshToken Error:", error.message);
    return res.status(400).json({ error: error.message });
  }
};

export const fetchModels = async (req, res) => {
  try {
    const provider = String(req.body.provider || "").trim().toLowerCase();
    const apiKey = String(req.body.apiKey || "").trim();
    const baseURL = String(req.body.baseURL || "").trim();

    if (!provider || !apiKey) {
      return res.status(400).json({ error: "provider and apiKey are required" });
    }
    if (provider !== "custom" && !KNOWN_PROVIDERS[provider]) {
      return res.status(400).json({ error: `Unknown provider: ${provider}` });
    }
    if (provider === "custom" && !baseURL) {
      return res.status(400).json({ error: "baseURL is required for custom provider" });
    }

    const providerModels = await fetchProviderModels({ provider, baseURL, apiKey });
    return res.json({ providerModels });
  } catch (error) {
    console.error("fetchModels Error:", error.message);
    // 400 hi rakho — 401 bheja toh frontend user ko logout kar dega
    return res.status(400).json({ error: error.message });
  }
};

// 14. AI providers ka fallback order badlo
export const reorderAiProviders = async (req, res) => {
  try {
    const { providerIds } = req.body;

    if (!Array.isArray(providerIds) || providerIds.length === 0) {
      return res.status(400).json({ error: "providerIds array is required" });
    }

    const account = await Account.findOne({ botIgId: req.botIgId })
      .select("aiProviders")
      .lean();

    if (!account) return res.status(404).json({ error: "Account not found" });

    const byId = new Map(account.aiProviders.map((p) => [String(p._id), p]));

    // Safety: stale UI se koi provider delete na ho jaye
    if (
      providerIds.length !== account.aiProviders.length ||
      providerIds.some((id) => !byId.has(String(id)))
    ) {
      return res
        .status(400)
        .json({ error: "Provider list changed — refresh and try again" });
    }

    const reordered = providerIds.map((id) => byId.get(String(id)));

    const updated = await Account.findOneAndUpdate(
      { botIgId: req.botIgId },
      { $set: { aiProviders: reordered } },
      { new: true, runValidators: true }
    ).select("+aiProviders.apiKey");

    return res.json({ account: sanitizeAccount(updated) });
  } catch (error) {
    console.error("reorderAiProviders Error:", error.message);
    return res.status(400).json({ error: error.message });
  }
};